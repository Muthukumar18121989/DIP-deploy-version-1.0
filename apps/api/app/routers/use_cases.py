from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user_optional
from app.db import get_db
from app.deps import get_use_case_or_404
from app.models import ConnectorConfig, Experiment, Strategy, UseCase, User
from app.pipeline import store
from app.schemas import UseCaseCreate, UseCaseOut, UseCaseSummaryOut, UseCaseUpdate

router = APIRouter(prefix="/api/use-cases", tags=["use-cases"])


def _completion_pct(db: Session, use_case_id: str) -> float:
    latest = db.execute(
        select(Experiment)
        .where(Experiment.use_case_id == use_case_id)
        .order_by(Experiment.created_at.desc())
    ).scalars().first()
    if latest is None:
        return 0.0
    if latest.status == "complete":
        return 100.0
    if latest.status == "running":
        return 50.0
    return 0.0


def _summarize(db: Session, use_case: UseCase) -> UseCaseSummaryOut:
    experiment_count = db.execute(
        select(Experiment).where(Experiment.use_case_id == use_case.id)
    ).scalars().all()
    decisions_count = len(
        db.execute(select(Strategy).where(Strategy.use_case_id == use_case.id)).scalars().all()
    )

    latest_experiment = db.execute(
        select(Experiment)
        .where(Experiment.use_case_id == use_case.id, Experiment.status == "complete")
        .order_by(Experiment.version_number.desc())
    ).scalars().first()

    active_strategy = None
    current_kpi = None
    if latest_experiment:
        active_strategy = db.execute(
            select(Strategy)
            .where(Strategy.experiment_id == latest_experiment.id)
            .order_by(Strategy.predicted_revenue_delta.desc())
        ).scalars().first()
        dashboard = store.load_json(latest_experiment.id, "dashboard")
        if dashboard:
            current_kpi = dashboard.get("kpis", {}).get("total_revenue")

    return UseCaseSummaryOut(
        **UseCaseOut.model_validate(use_case).model_dump(),
        ai_completion_pct=_completion_pct(db, use_case.id),
        experiment_count=len(experiment_count),
        decisions_count=decisions_count,
        active_strategy_id=active_strategy.id if active_strategy else None,
        active_strategy_name=active_strategy.title if active_strategy else None,
        current_kpi=current_kpi,
        current_roi=active_strategy.estimated_roi if active_strategy else None,
    )


@router.post("", response_model=UseCaseOut)
def create_use_case(
    payload: UseCaseCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    use_case = UseCase(**payload.model_dump())
    # Anonymous creation (no logged-in user) is untouched — owner stays the
    # existing "Unassigned" default. Logged-in creation attributes it, which
    # is what the Admin Dashboard reads to show "this user's use cases".
    if current_user is not None:
        use_case.owner_user_id = current_user.id
        use_case.owner = current_user.name
    db.add(use_case)
    db.commit()
    db.refresh(use_case)
    return use_case


@router.get("", response_model=list[UseCaseSummaryOut])
def list_use_cases(db: Session = Depends(get_db)):
    use_cases = db.execute(select(UseCase).order_by(UseCase.updated_at.desc())).scalars().all()
    return [_summarize(db, uc) for uc in use_cases]


@router.get("/{use_case_id}", response_model=UseCaseOut)
def get_use_case(use_case: UseCase = Depends(get_use_case_or_404)):
    return use_case


@router.patch("/{use_case_id}", response_model=UseCaseOut)
def update_use_case(
    payload: UseCaseUpdate,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(use_case, key, value)
    db.commit()
    db.refresh(use_case)
    return use_case


@router.post("/{use_case_id}/duplicate", response_model=UseCaseOut)
def duplicate_use_case(
    use_case_id: str,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    clone = UseCase(
        name=f"{use_case.name} (Copy)",
        problem=use_case.problem,
        objective=use_case.objective,
        kpi=use_case.kpi,
        description=use_case.description,
        industry=use_case.industry,
        owner=use_case.owner,
        tags=list(use_case.tags),
        status="created",
    )
    db.add(clone)
    db.flush()

    raw_df = store.load_raw_df(use_case_id)
    if raw_df is not None:
        store.save_raw_df(clone.id, raw_df)
        clone.status = use_case.status
        clone.data_source = use_case.data_source
        clone.row_count = use_case.row_count

    db.commit()
    db.refresh(clone)
    return clone


@router.delete("/{use_case_id}", status_code=204)
def delete_use_case(
    use_case_id: str,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    experiments = db.execute(
        select(Experiment).where(Experiment.use_case_id == use_case_id)
    ).scalars().all()
    for experiment in experiments:
        store.delete_artifacts(experiment.id)
        db.execute(
            Strategy.__table__.delete().where(Strategy.experiment_id == experiment.id)
        )
        db.delete(experiment)

    db.execute(ConnectorConfig.__table__.delete().where(ConnectorConfig.use_case_id == use_case_id))
    store.delete_artifacts(use_case_id)

    db.delete(use_case)
    db.commit()
    return None
