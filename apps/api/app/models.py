import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class UseCase(Base):
    __tablename__ = "use_cases"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    problem: Mapped[str] = mapped_column(Text, nullable=False)
    objective: Mapped[str] = mapped_column(Text, nullable=False)
    kpi: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    industry: Mapped[str] = mapped_column(String, default="Sales")
    status: Mapped[str] = mapped_column(String, default="created")
    # "created" -> "data_ready" -> "pipeline_running" -> "pipeline_complete"
    # (repository UI additionally maps these to draft/data_connected/etc. —
    # see lib/status.ts on the frontend; stored values are never renamed so
    # existing rows keep reading correctly)
    data_source: Mapped[str | None] = mapped_column(String, nullable=True)
    row_count: Mapped[int | None] = mapped_column(nullable=True)
    owner: Mapped[str] = mapped_column(String, default="Unassigned")
    # Nullable so every pre-existing row keeps working unchanged (stays
    # unattributed, exactly as it displays today). Set only when the use
    # case is created by a logged-in user — see routers/use_cases.py.
    owner_user_id: Mapped[str | None] = mapped_column(String, nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    archived: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class Experiment(Base):
    """One immutable pipeline run. Every AI re-run creates a new row here
    instead of overwriting the previous one — this is what makes versioning
    and side-by-side comparison possible."""

    __tablename__ = "experiments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    use_case_id: Mapped[str] = mapped_column(String, nullable=False)
    version_number: Mapped[int] = mapped_column(default=1)
    status: Mapped[str] = mapped_column(String, default="running")
    # "running" -> "complete" -> "error"
    execution_time_seconds: Mapped[float | None] = mapped_column(nullable=True)
    created_by: Mapped[str] = mapped_column(String, default="You")
    input_snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    parent_experiment_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Strategy(Base):
    """A generated business decision, persisted as a reusable, lifecycle-
    tracked strategy — the Decision Library entry. One row per decision
    option per experiment; Lock-In creates a new version linked via
    parent_strategy_id."""

    __tablename__ = "strategies"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    use_case_id: Mapped[str] = mapped_column(String, nullable=False)
    experiment_id: Mapped[str] = mapped_column(String, nullable=False)
    parent_strategy_id: Mapped[str | None] = mapped_column(String, nullable=True)
    version_number: Mapped[int] = mapped_column(default=1)
    decision_key: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    lever: Mapped[str] = mapped_column(String, nullable=False)
    confidence_pct: Mapped[float] = mapped_column(default=0.0)
    predicted_revenue_delta: Mapped[float] = mapped_column(default=0.0)
    predicted_revenue_delta_pct: Mapped[float] = mapped_column(default=0.0)
    risk: Mapped[str] = mapped_column(String, default="Medium")
    estimated_cost: Mapped[float] = mapped_column(default=0.0)
    estimated_roi: Mapped[float | None] = mapped_column(nullable=True)
    implementation_difficulty: Mapped[str] = mapped_column(String, default="Medium")
    timeline: Mapped[str] = mapped_column(String, default="")
    pros: Mapped[list] = mapped_column(JSON, default=list)
    cons: Mapped[list] = mapped_column(JSON, default=list)
    methodology: Mapped[str] = mapped_column(Text, default="")
    lifecycle_status: Mapped[str] = mapped_column(String, default="generated")
    # generated -> reviewed -> sandbox_tested -> locked_in -> approved -> published -> monitoring -> archived
    sandbox_deltas: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class MonitoringSnapshot(Base):
    """A manually-recorded actual-KPI reading for a published strategy,
    compared against that strategy's predicted impact. There is no live
    production data feed in this environment, so 'actual' is user-entered —
    the variance math on top of it is real."""

    __tablename__ = "monitoring_snapshots"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    strategy_id: Mapped[str] = mapped_column(String, nullable=False)
    expected_revenue_delta_pct: Mapped[float] = mapped_column(default=0.0)
    actual_revenue_delta_pct: Mapped[float] = mapped_column(default=0.0)
    variance_pct: Mapped[float] = mapped_column(default=0.0)
    note: Mapped[str] = mapped_column(Text, default="")
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class ConnectorConfig(Base):
    """Saved configuration for a data-source or publish-target connector.

    No live network call is ever made from this record. It exists purely
    so the connector gallery UI can persist and reflect real user input.
    """

    __tablename__ = "connector_configs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    use_case_id: Mapped[str] = mapped_column(String, nullable=False)
    connector_key: Mapped[str] = mapped_column(String, nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False)  # "source" | "publish"
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class WidgetLayout(Base):
    """One row per dashboard widget's position. The whole layout for a
    dashboard is replaced in one PUT on reorder — simplest correct model
    for a small, fixed widget set."""

    __tablename__ = "widget_layouts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    use_case_id: Mapped[str] = mapped_column(String, nullable=False)
    dashboard_key: Mapped[str] = mapped_column(String, default="executive")
    widget_id: Mapped[str] = mapped_column(String, nullable=False)
    order_index: Mapped[int] = mapped_column(default=0)
    width: Mapped[int] = mapped_column(default=1)  # 1 = half-width, 2 = full-width
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class User(Base):
    """An account. Only two roles exist: 'admin' (sees the Admin Dashboard —
    every user and their use cases/uploaded data) and 'user' (the default —
    behaves exactly like the app already did before accounts existed; being
    logged in only attributes new use cases to you, it changes no other
    behavior)."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    password_salt: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default="user")  # "user" | "admin"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Session(Base):
    """An opaque bearer token issued on login/register. No JWT — a random
    token looked up against this table, same trust model as a typical
    server-side session, just carried in an Authorization header instead of
    a cookie since the frontend and backend can be on different hosts."""

    __tablename__ = "sessions"

    token: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class WidgetConfig(Base):
    """A versioned chart configuration for one widget — mirrors the
    Experiment/Strategy versioning pattern: every change (manual or
    AI-applied) inserts a new row instead of overwriting the last one, so
    Undo is just reading the previous version."""

    __tablename__ = "widget_configs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    use_case_id: Mapped[str] = mapped_column(String, nullable=False)
    dashboard_key: Mapped[str] = mapped_column(String, default="executive")
    widget_id: Mapped[str] = mapped_column(String, nullable=False)
    version_number: Mapped[int] = mapped_column(default=1)
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    created_by: Mapped[str] = mapped_column(String, default="user")  # "user" | "ai"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
