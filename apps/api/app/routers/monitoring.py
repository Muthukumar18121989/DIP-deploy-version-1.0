"""Actual-vs-expected KPI monitoring for published strategies.

There's no live production data feed in this environment, so the "actual"
reading is entered by the user — but the variance/drift math on top of it
is computed for real, not fabricated.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_strategy_or_404
from app.models import MonitoringSnapshot, Strategy
from app.schemas import MonitoringIn, MonitoringOut

router = APIRouter(tags=["monitoring"])

DRIFT_THRESHOLD_PCT = 15.0


@router.get("/api/strategies/{strategy_id}/monitoring", response_model=list[MonitoringOut])
def list_monitoring(
    strategy_id: str,
    db: Session = Depends(get_db),
    strategy: Strategy = Depends(get_strategy_or_404),
):
    return db.execute(
        select(MonitoringSnapshot)
        .where(MonitoringSnapshot.strategy_id == strategy_id)
        .order_by(MonitoringSnapshot.recorded_at.desc())
    ).scalars().all()


@router.post("/api/strategies/{strategy_id}/monitoring", response_model=MonitoringOut)
def record_monitoring(
    payload: MonitoringIn,
    db: Session = Depends(get_db),
    strategy: Strategy = Depends(get_strategy_or_404),
):
    expected = strategy.predicted_revenue_delta_pct
    actual = payload.actual_revenue_delta_pct
    variance = round(actual - expected, 2)

    snapshot = MonitoringSnapshot(
        strategy_id=strategy.id,
        expected_revenue_delta_pct=expected,
        actual_revenue_delta_pct=actual,
        variance_pct=variance,
        note=payload.note,
    )
    db.add(snapshot)

    if strategy.lifecycle_status in ("published",):
        strategy.lifecycle_status = "monitoring"

    db.commit()
    db.refresh(snapshot)
    return snapshot
