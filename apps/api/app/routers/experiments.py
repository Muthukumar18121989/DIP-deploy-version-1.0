from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_experiment_or_404, get_use_case_or_404
from app.models import Experiment, UseCase
from app.pipeline import store
from app.schemas import ExperimentOut

router = APIRouter(tags=["experiments"])


@router.get("/api/use-cases/{use_case_id}/experiments", response_model=list[ExperimentOut])
def list_experiments(
    use_case_id: str,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    return db.execute(
        select(Experiment)
        .where(Experiment.use_case_id == use_case_id)
        .order_by(Experiment.version_number.desc())
    ).scalars().all()


@router.get("/api/experiments/{experiment_id}", response_model=ExperimentOut)
def get_experiment(experiment: Experiment = Depends(get_experiment_or_404)):
    return experiment


@router.get("/api/experiments/{experiment_id}/detail")
def get_experiment_detail(experiment: Experiment = Depends(get_experiment_or_404)):
    """Full reopen of a past experiment — every artifact it produced."""
    if experiment.status != "complete":
        raise HTTPException(status_code=409, detail=f"Experiment is {experiment.status}, not complete yet.")
    return {
        "profiling": store.load_json(experiment.id, "profiling"),
        "training": store.load_json(experiment.id, "training"),
        "decisions": store.load_json(experiment.id, "decisions"),
        "forecast": store.load_json(experiment.id, "forecast"),
        "dashboard": store.load_json(experiment.id, "dashboard"),
    }
