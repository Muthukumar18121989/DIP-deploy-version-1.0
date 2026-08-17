import json
import time

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal, get_db
from app.deps import get_use_case_or_404, resolve_experiment_id
from app.models import Experiment, Strategy, UseCase
from app.pipeline import store
from app.pipeline.features import REQUIRED_SALES_COLUMNS
from app.pipeline.orchestrator import run_pipeline
from app.pipeline.simulate import run_simulation
from app.schemas import SimulateRequest

router = APIRouter(prefix="/api/use-cases/{use_case_id}", tags=["pipeline"])


@router.get("/pipeline/stream")
def stream_pipeline(
    use_case_id: str,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    df = store.load_raw_df(use_case_id)
    if df is None:
        raise HTTPException(status_code=404, detail="No data attached to this use case yet.")
    missing = REQUIRED_SALES_COLUMNS - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Dataset doesn't match the Sales schema this pipeline expects. "
            f"Missing columns: {', '.join(sorted(missing))}.",
        )

    version_number = (
        db.execute(
            select(Experiment).where(Experiment.use_case_id == use_case_id)
        ).scalars().all()
    )
    experiment = Experiment(
        use_case_id=use_case_id,
        version_number=len(version_number) + 1,
        status="running",
        input_snapshot={
            "name": use_case.name,
            "problem": use_case.problem,
            "objective": use_case.objective,
            "kpi": use_case.kpi,
            "description": use_case.description,
        },
    )
    db.add(experiment)
    use_case.status = "pipeline_running"
    db.commit()
    db.refresh(experiment)

    use_case_dict = dict(experiment.input_snapshot)
    experiment_id = experiment.id
    started_at = time.monotonic()

    def generate():
        # SSE streams run past the request's own DB session lifetime, so this
        # generator opens its own short-lived session for the status/Strategy
        # writes it needs to make as stages complete.
        session = SessionLocal()
        # Every completed stage is also written to the experiment's artifact
        # store, so the pipeline view can rehydrate its stage-by-stage
        # narration later. Without this the run's events live only in the
        # browser tab that started it, and a reload — or a new tab, or another
        # device — shows a use case with decisions and a dashboard but a
        # pipeline that looks like it never ran.
        completed_events: list[dict] = []
        try:
            for event in run_pipeline(experiment_id, use_case_id, use_case_dict):
                if event["stage"] == "decision_generation" and event["status"] == "complete":
                    decisions = event["data"]["decisions"]
                    for decision in decisions:
                        session.add(
                            Strategy(
                                use_case_id=use_case_id,
                                experiment_id=experiment_id,
                                version_number=1,
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
                                lifecycle_status="generated",
                            )
                        )
                    session.commit()

                if event["status"] == "complete":
                    # Saved per stage rather than once at the end, so a run
                    # that errors partway still rehydrates the stages that did
                    # finish instead of losing all of them.
                    completed_events.append(event)
                    store.save_json(experiment_id, "events", completed_events)

                yield f"data: {json.dumps(event, default=str)}\n\n"

            experiment_row = session.get(Experiment, experiment_id)
            experiment_row.status = "complete"
            experiment_row.execution_time_seconds = round(time.monotonic() - started_at, 2)
            use_case_row = session.get(UseCase, use_case_id)
            use_case_row.status = "pipeline_complete"
            session.commit()
        except Exception as exc:  # surfaced to the UI as a real error event, not swallowed
            experiment_row = session.get(Experiment, experiment_id)
            if experiment_row:
                experiment_row.status = "error"
            use_case_row = session.get(UseCase, use_case_id)
            if use_case_row:
                use_case_row.status = "pipeline_error"
            session.commit()
            error_payload = {"stage": "error", "status": "error", "what_happened": str(exc)}
            yield f"data: {json.dumps(error_payload)}\n\n"
        finally:
            session.close()

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/pipeline/events")
def get_pipeline_events(
    use_case_id: str,
    experiment_id: str | None = None,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    """The stage-by-stage narration of the most recent run, so the pipeline
    view can be restored after a reload instead of appearing to have never run.

    Unlike the other read endpoints here this resolves to the latest experiment
    of *any* status, not the latest complete one. A tab that reloaded midway
    through a run needs the events of the run it was actually watching; handing
    it the previous run's would silently show the wrong version. `status` lets
    the client tell a finished run from one still in progress.
    """
    if experiment_id:
        experiment = db.get(Experiment, experiment_id)
    else:
        experiment = db.execute(
            select(Experiment)
            .where(Experiment.use_case_id == use_case_id)
            .order_by(Experiment.version_number.desc())
        ).scalars().first()
    if experiment is None:
        raise HTTPException(status_code=404, detail="Pipeline hasn't been run for this use case yet.")

    return {
        "experiment_id": experiment.id,
        "status": experiment.status,
        "events": store.load_json(experiment.id, "events") or [],
    }


@router.get("/decisions")
def get_decisions(
    use_case_id: str,
    experiment_id: str | None = None,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    resolved_id = resolve_experiment_id(db, use_case_id, experiment_id)
    decisions = store.load_json(resolved_id, "decisions")
    if decisions is None:
        raise HTTPException(status_code=404, detail="Pipeline hasn't been run for this use case yet.")
    return decisions


@router.get("/dashboard")
def get_dashboard(
    use_case_id: str,
    experiment_id: str | None = None,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    resolved_id = resolve_experiment_id(db, use_case_id, experiment_id)
    dashboard = store.load_json(resolved_id, "dashboard")
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Pipeline hasn't been run for this use case yet.")
    return dashboard


@router.get("/training")
def get_training(
    use_case_id: str,
    experiment_id: str | None = None,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    resolved_id = resolve_experiment_id(db, use_case_id, experiment_id)
    training = store.load_json(resolved_id, "training")
    if training is None:
        raise HTTPException(status_code=404, detail="Pipeline hasn't been run for this use case yet.")
    return training


@router.post("/simulate")
def simulate(
    use_case_id: str,
    payload: SimulateRequest,
    experiment_id: str | None = None,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    resolved_id = resolve_experiment_id(db, use_case_id, experiment_id)
    model = store.load_model(resolved_id)
    encoded, feature_columns = store.load_encoded(resolved_id)
    if model is None or encoded is None:
        raise HTTPException(status_code=404, detail="Pipeline hasn't been run for this use case yet.")
    return run_simulation(model, encoded, feature_columns, payload.model_dump())
