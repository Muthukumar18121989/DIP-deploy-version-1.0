from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Experiment, Strategy, UseCase


def get_use_case_or_404(use_case_id: str, db: Session = Depends(get_db)) -> UseCase:
    use_case = db.get(UseCase, use_case_id)
    if use_case is None:
        raise HTTPException(status_code=404, detail="Use case not found")
    return use_case


def get_latest_experiment(db: Session, use_case_id: str) -> Experiment | None:
    return db.execute(
        select(Experiment)
        .where(Experiment.use_case_id == use_case_id, Experiment.status == "complete")
        .order_by(Experiment.version_number.desc())
    ).scalars().first()


def resolve_experiment_id(db: Session, use_case_id: str, experiment_id: str | None) -> str:
    """Resolve the experiment to read from: the given id, or the use case's
    latest completed experiment if none was specified."""
    if experiment_id:
        return experiment_id
    latest = get_latest_experiment(db, use_case_id)
    if latest is None:
        raise HTTPException(status_code=404, detail="No completed pipeline run for this use case yet.")
    return latest.id


def get_experiment_or_404(experiment_id: str, db: Session = Depends(get_db)) -> Experiment:
    experiment = db.get(Experiment, experiment_id)
    if experiment is None:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return experiment


def get_strategy_or_404(strategy_id: str, db: Session = Depends(get_db)) -> Strategy:
    strategy = db.get(Strategy, strategy_id)
    if strategy is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return strategy
