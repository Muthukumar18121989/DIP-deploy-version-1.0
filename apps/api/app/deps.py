"""Shared route dependencies.

Every use-case-scoped resource (experiments, strategies, data, pipeline
artifacts, widgets, connectors, monitoring) is reached through one of the
*_or_404 helpers below, and each of them checks that the signed-in user may
access the owning use case. A resource the user can't access answers 404,
not 403, so its existence isn't revealed to other accounts.
"""

from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import can_access_use_case, get_current_user, get_current_user_for_stream
from app.db import get_db
from app.models import Experiment, Strategy, UseCase, User


def _load_use_case_for(user: User, use_case_id: str, db: Session) -> UseCase:
    use_case = db.get(UseCase, use_case_id)
    if use_case is None or not can_access_use_case(user, use_case.owner_user_id):
        raise HTTPException(status_code=404, detail="Use case not found")
    return use_case


def get_use_case_or_404(
    use_case_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UseCase:
    return _load_use_case_for(user, use_case_id, db)


def get_use_case_for_stream_or_404(
    use_case_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_for_stream),
) -> UseCase:
    return _load_use_case_for(user, use_case_id, db)


def get_latest_experiment(db: Session, use_case_id: str) -> Experiment | None:
    return db.execute(
        select(Experiment)
        .where(Experiment.use_case_id == use_case_id, Experiment.status == "complete")
        .order_by(Experiment.version_number.desc())
    ).scalars().first()


def resolve_experiment_id(db: Session, use_case_id: str, experiment_id: str | None) -> str:
    """Resolve the experiment to read from: the given id, or the use case's
    latest completed experiment if none was specified. A given id must belong
    to this use case, so an experiment id from another account's use case
    can't be read through a use case you do own."""
    if experiment_id:
        experiment = db.get(Experiment, experiment_id)
        if experiment is None or experiment.use_case_id != use_case_id:
            raise HTTPException(status_code=404, detail="Experiment not found")
        return experiment_id
    latest = get_latest_experiment(db, use_case_id)
    if latest is None:
        raise HTTPException(status_code=404, detail="No completed pipeline run for this use case yet.")
    return latest.id


def get_experiment_or_404(
    experiment_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Experiment:
    experiment = db.get(Experiment, experiment_id)
    if experiment is None:
        raise HTTPException(status_code=404, detail="Experiment not found")
    use_case = db.get(UseCase, experiment.use_case_id)
    if use_case is None or not can_access_use_case(user, use_case.owner_user_id):
        raise HTTPException(status_code=404, detail="Experiment not found")
    return experiment


def get_strategy_or_404(
    strategy_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Strategy:
    strategy = db.get(Strategy, strategy_id)
    if strategy is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    use_case = db.get(UseCase, strategy.use_case_id)
    if use_case is None or not can_access_use_case(user, use_case.owner_user_id):
        raise HTTPException(status_code=404, detail="Strategy not found")
    return strategy


def accessible_use_case_ids(db: Session, user: User) -> list[str] | None:
    """None means 'no filter' (admin)."""
    if user.role == "admin":
        return None
    return list(db.execute(select(UseCase.id).where(UseCase.owner_user_id == user.id)).scalars().all())
