"""Connector configuration — persists real user input, but never performs a
live network call to any external system. See README for why.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_use_case_or_404
from app.models import ConnectorConfig, UseCase
from app.schemas import ConnectorConfigIn, ConnectorConfigOut

router = APIRouter(prefix="/api/use-cases/{use_case_id}/connectors", tags=["connectors"])


@router.get("", response_model=list[ConnectorConfigOut])
def list_connectors(
    use_case_id: str,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    return db.execute(
        select(ConnectorConfig).where(ConnectorConfig.use_case_id == use_case_id)
    ).scalars().all()


@router.put("", response_model=ConnectorConfigOut)
def upsert_connector(
    use_case_id: str,
    payload: ConnectorConfigIn,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    existing = db.execute(
        select(ConnectorConfig).where(
            ConnectorConfig.use_case_id == use_case_id,
            ConnectorConfig.connector_key == payload.connector_key,
        )
    ).scalar_one_or_none()

    if existing:
        existing.config = payload.config
        existing.kind = payload.kind
        db.commit()
        db.refresh(existing)
        return existing

    connector = ConnectorConfig(use_case_id=use_case_id, **payload.model_dump())
    db.add(connector)
    db.commit()
    db.refresh(connector)
    return connector
