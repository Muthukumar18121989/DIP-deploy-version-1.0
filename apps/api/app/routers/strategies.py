import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.auth import get_current_user
from app.deps import accessible_use_case_ids, get_strategy_or_404, get_use_case_or_404
from app.models import Experiment, Strategy, UseCase, User
from app.pipeline import store
from app.pipeline.decisions import apply_raw_deltas, generate_decisions
from app.pipeline.features import encode_features, engineer_features
from app.pipeline.forecasting import forecast_revenue
from app.pipeline.orchestrator import build_dashboard
from app.pipeline.profiling import profile_dataframe
from app.pipeline.schema import available_roles, real_columns_frame
from app.pipeline.training import train_and_compare
from app.schemas import LockInRequest, StrategyOut, StrategyUpdate

router = APIRouter(tags=["strategies"])


@router.get("/api/use-cases/{use_case_id}/strategies", response_model=list[StrategyOut])
def list_strategies(
    use_case_id: str,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    return db.execute(
        select(Strategy)
        .where(Strategy.use_case_id == use_case_id)
        .order_by(Strategy.created_at.desc())
    ).scalars().all()


@router.get("/api/strategies/compare", response_model=list[StrategyOut])
def compare_strategies(ids: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    strategy_ids = [s for s in ids.split(",") if s]
    if not (2 <= len(strategy_ids) <= 4):
        raise HTTPException(status_code=400, detail="Compare between 2 and 4 strategies.")
    query = select(Strategy).where(Strategy.id.in_(strategy_ids))
    allowed = accessible_use_case_ids(db, current_user)
    if allowed is not None:
        query = query.where(Strategy.use_case_id.in_(allowed))
    strategies = db.execute(query).scalars().all()
    by_id = {s.id: s for s in strategies}
    missing = [sid for sid in strategy_ids if sid not in by_id]
    if missing:
        raise HTTPException(status_code=404, detail=f"Strategy not found: {', '.join(missing)}")
    return [by_id[sid] for sid in strategy_ids]


@router.get("/api/strategies/{strategy_id}", response_model=StrategyOut)
def get_strategy(strategy: Strategy = Depends(get_strategy_or_404)):
    return strategy


@router.get("/api/strategies/{strategy_id}/report")
def get_strategy_report(strategy: Strategy = Depends(get_strategy_or_404)):
    """The full decision report — the strategy plus the real experiment
    artifacts (profiling, training, forecast) it was generated from."""
    return {
        "strategy": StrategyOut.model_validate(strategy).model_dump(),
        "profiling": store.load_json(strategy.experiment_id, "profiling"),
        "training": store.load_json(strategy.experiment_id, "training"),
        "forecast": store.load_json(strategy.experiment_id, "forecast"),
        "dashboard": store.load_json(strategy.experiment_id, "dashboard"),
    }


@router.patch("/api/strategies/{strategy_id}", response_model=StrategyOut)
def update_strategy(
    payload: StrategyUpdate,
    db: Session = Depends(get_db),
    strategy: Strategy = Depends(get_strategy_or_404),
):
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(strategy, key, value)
    db.commit()
    db.refresh(strategy)
    return strategy


@router.post("/api/strategies/{strategy_id}/duplicate", response_model=StrategyOut)
def duplicate_strategy(
    db: Session = Depends(get_db),
    strategy: Strategy = Depends(get_strategy_or_404),
):
    clone = Strategy(
        use_case_id=strategy.use_case_id,
        experiment_id=strategy.experiment_id,
        parent_strategy_id=strategy.id,
        version_number=strategy.version_number + 1,
        decision_key=strategy.decision_key,
        title=f"{strategy.title} (Copy)",
        lever=strategy.lever,
        confidence_pct=strategy.confidence_pct,
        predicted_revenue_delta=strategy.predicted_revenue_delta,
        predicted_revenue_delta_pct=strategy.predicted_revenue_delta_pct,
        risk=strategy.risk,
        estimated_cost=strategy.estimated_cost,
        estimated_roi=strategy.estimated_roi,
        implementation_difficulty=strategy.implementation_difficulty,
        timeline=strategy.timeline,
        pros=list(strategy.pros),
        cons=list(strategy.cons),
        methodology=strategy.methodology,
        lifecycle_status="generated",
        sandbox_deltas=strategy.sandbox_deltas,
    )
    db.add(clone)
    db.commit()
    db.refresh(clone)
    return clone


@router.post("/api/strategies/{strategy_id}/lock-in", response_model=StrategyOut)
def lock_in_strategy(
    payload: LockInRequest,
    db: Session = Depends(get_db),
    strategy: Strategy = Depends(get_strategy_or_404),
):
    """Freezes the sandbox scenario and genuinely re-runs the ML pipeline
    against it: the scenario deltas are applied to the raw dataset, features
    are re-engineered, models retrained, decisions regenerated, and a new
    Experiment + Strategy version is saved — nothing here is precomputed or
    faked, it's the same pipeline the AI Pipeline page runs, just synchronous.
    """
    raw_df = store.load_raw_df(strategy.use_case_id)
    if raw_df is None:
        raise HTTPException(status_code=404, detail="No data attached to this use case.")

    deltas = payload.deltas.model_dump()
    started_at = time.monotonic()

    version_count = len(
        db.execute(select(Experiment).where(Experiment.use_case_id == strategy.use_case_id)).scalars().all()
    )
    experiment = Experiment(
        use_case_id=strategy.use_case_id,
        version_number=version_count + 1,
        status="running",
        parent_experiment_id=strategy.experiment_id,
        input_snapshot={"lock_in_from_strategy": strategy.id, "deltas": deltas},
    )
    db.add(experiment)
    db.flush()

    data_meta = store.load_json(strategy.use_case_id, "data_meta")
    available = available_roles(data_meta)
    adjusted_df = apply_raw_deltas(raw_df, deltas, available=available)
    profiling = profile_dataframe(real_columns_frame(adjusted_df, data_meta))
    features = engineer_features(adjusted_df)
    encoded, feature_columns = encode_features(features)
    training_result = train_and_compare(encoded, feature_columns)
    decisions = generate_decisions(
        training_result["best_model"], encoded, feature_columns, training_result["cv_r2_mean"], available
    )
    forecast = forecast_revenue(adjusted_df)
    dashboard = build_dashboard(adjusted_df, features, profiling, decisions, forecast, available)

    store.save_json(experiment.id, "profiling", profiling)
    store.save_encoded(experiment.id, encoded, feature_columns)
    store.save_model(experiment.id, training_result["best_model"])
    store.save_json(experiment.id, "training", {
        "comparison": training_result["comparison"],
        "best_model_name": training_result["best_model_name"],
        "feature_importances": training_result["feature_importances"],
    })
    store.save_json(experiment.id, "decisions", decisions)
    store.save_json(experiment.id, "forecast", forecast)
    store.save_json(experiment.id, "dashboard", dashboard)

    experiment.status = "complete"
    experiment.execution_time_seconds = round(time.monotonic() - started_at, 2)

    locked_in_strategy = None
    for decision in decisions:
        new_strategy = Strategy(
            use_case_id=strategy.use_case_id,
            experiment_id=experiment.id,
            parent_strategy_id=strategy.id if decision["id"] == strategy.decision_key else None,
            version_number=strategy.version_number + 1 if decision["id"] == strategy.decision_key else 1,
            decision_key=decision["id"],
            title=decision["title"],
            lever=decision["lever"],
            confidence_pct=decision["confidence_pct"],
            predicted_revenue_delta=decision["predicted_revenue_delta"],
            predicted_revenue_delta_pct=decision["predicted_revenue_delta_pct"],
            risk=decision["risk"],
            estimated_cost=decision["estimated_cost"],
            estimated_roi=decision["estimated_roi"],
            implementation_difficulty=decision["implementation_difficulty"],
            timeline=decision["timeline"],
            pros=decision["pros"],
            cons=decision["cons"],
            methodology=decision["methodology"],
            lifecycle_status="locked_in" if decision["id"] == strategy.decision_key else "generated",
            sandbox_deltas=deltas if decision["id"] == strategy.decision_key else None,
        )
        db.add(new_strategy)
        if decision["id"] == strategy.decision_key:
            locked_in_strategy = new_strategy

    if locked_in_strategy is None:
        # Decisions are sized from the data, so after locking in a scenario
        # the same option may no longer be generated (e.g. the lever is now
        # already at its historical high). Keep the user's decision anyway,
        # as a new version attached to the re-run experiment.
        locked_in_strategy = Strategy(
            use_case_id=strategy.use_case_id,
            experiment_id=experiment.id,
            parent_strategy_id=strategy.id,
            version_number=strategy.version_number + 1,
            decision_key=strategy.decision_key,
            title=strategy.title,
            lever=strategy.lever,
            confidence_pct=strategy.confidence_pct,
            predicted_revenue_delta=strategy.predicted_revenue_delta,
            predicted_revenue_delta_pct=strategy.predicted_revenue_delta_pct,
            risk=strategy.risk,
            estimated_cost=strategy.estimated_cost,
            estimated_roi=strategy.estimated_roi,
            implementation_difficulty=strategy.implementation_difficulty,
            timeline=strategy.timeline,
            pros=list(strategy.pros),
            cons=list(strategy.cons),
            methodology=strategy.methodology,
            lifecycle_status="locked_in",
            sandbox_deltas=deltas,
        )
        db.add(locked_in_strategy)

    db.commit()
    db.refresh(locked_in_strategy)
    return locked_in_strategy
