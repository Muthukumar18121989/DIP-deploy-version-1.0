"""Dashboard widget layout + AI-configurable chart config, versioned the
same way Experiment/Strategy are elsewhere in this app: every change is a
new row, never an overwrite, so Undo is just reading the previous version.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_use_case_or_404
from app.models import UseCase, WidgetConfig, WidgetLayout
from app.schemas import WidgetConfigIn, WidgetConfigOut, WidgetLayoutOut, WidgetLayoutPut

router = APIRouter(tags=["widgets"])


@router.get("/api/use-cases/{use_case_id}/widget-layout", response_model=list[WidgetLayoutOut])
def get_widget_layout(
    use_case_id: str,
    dashboard_key: str = "executive",
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    return db.execute(
        select(WidgetLayout)
        .where(WidgetLayout.use_case_id == use_case_id, WidgetLayout.dashboard_key == dashboard_key)
        .order_by(WidgetLayout.order_index)
    ).scalars().all()


@router.put("/api/use-cases/{use_case_id}/widget-layout", response_model=list[WidgetLayoutOut])
def put_widget_layout(
    payload: WidgetLayoutPut,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    """Replaces the whole layout for this dashboard in one call — simplest
    correct approach for a small, fixed widget set that's reordered as a unit."""
    existing = db.execute(
        select(WidgetLayout).where(
            WidgetLayout.use_case_id == use_case.id,
            WidgetLayout.dashboard_key == payload.dashboard_key,
        )
    ).scalars().all()
    for row in existing:
        db.delete(row)
    db.flush()

    rows = []
    for item in payload.layout:
        row = WidgetLayout(
            use_case_id=use_case.id,
            dashboard_key=payload.dashboard_key,
            widget_id=item.widget_id,
            order_index=item.order_index,
            width=item.width,
        )
        db.add(row)
        rows.append(row)

    db.commit()
    for row in rows:
        db.refresh(row)
    return sorted(rows, key=lambda r: r.order_index)


@router.get("/api/use-cases/{use_case_id}/widgets/{widget_id}/config", response_model=WidgetConfigOut)
def get_widget_config(
    use_case_id: str,
    widget_id: str,
    dashboard_key: str = "executive",
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    latest = db.execute(
        select(WidgetConfig)
        .where(
            WidgetConfig.use_case_id == use_case_id,
            WidgetConfig.dashboard_key == dashboard_key,
            WidgetConfig.widget_id == widget_id,
        )
        .order_by(WidgetConfig.version_number.desc())
    ).scalars().first()
    if latest is None:
        raise HTTPException(status_code=404, detail="No saved configuration — widget is using its default.")
    return latest


@router.post("/api/use-cases/{use_case_id}/widgets/{widget_id}/config", response_model=WidgetConfigOut)
def create_widget_config_version(
    use_case_id: str,
    widget_id: str,
    payload: WidgetConfigIn,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    prev_count = len(
        db.execute(
            select(WidgetConfig).where(
                WidgetConfig.use_case_id == use_case_id,
                WidgetConfig.dashboard_key == payload.dashboard_key,
                WidgetConfig.widget_id == widget_id,
            )
        ).scalars().all()
    )
    row = WidgetConfig(
        use_case_id=use_case_id,
        dashboard_key=payload.dashboard_key,
        widget_id=widget_id,
        version_number=prev_count + 1,
        config=payload.config,
        created_by=payload.created_by,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get(
    "/api/use-cases/{use_case_id}/widgets/{widget_id}/config/history",
    response_model=list[WidgetConfigOut],
)
def get_widget_config_history(
    use_case_id: str,
    widget_id: str,
    dashboard_key: str = "executive",
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    return db.execute(
        select(WidgetConfig)
        .where(
            WidgetConfig.use_case_id == use_case_id,
            WidgetConfig.dashboard_key == dashboard_key,
            WidgetConfig.widget_id == widget_id,
        )
        .order_by(WidgetConfig.version_number.desc())
    ).scalars().all()


@router.post(
    "/api/use-cases/{use_case_id}/widgets/{widget_id}/config/undo",
    response_model=WidgetConfigOut,
)
def undo_widget_config(
    use_case_id: str,
    widget_id: str,
    dashboard_key: str = "executive",
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    """Undo creates a new version copying the previous config — same
    forward-only-versioning safety used by the rest of this app."""
    history = db.execute(
        select(WidgetConfig)
        .where(
            WidgetConfig.use_case_id == use_case_id,
            WidgetConfig.dashboard_key == dashboard_key,
            WidgetConfig.widget_id == widget_id,
        )
        .order_by(WidgetConfig.version_number.desc())
        .limit(2)
    ).scalars().all()

    if len(history) < 2:
        raise HTTPException(status_code=409, detail="No previous version to undo to.")

    previous = history[1]
    row = WidgetConfig(
        use_case_id=use_case_id,
        dashboard_key=dashboard_key,
        widget_id=widget_id,
        version_number=history[0].version_number + 1,
        config=previous.config,
        created_by="user",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
