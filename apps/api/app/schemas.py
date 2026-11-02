from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UseCaseCreate(BaseModel):
    name: str
    problem: str
    objective: str
    kpi: str
    description: str
    industry: str = "Sales"


class UseCaseUpdate(BaseModel):
    name: str | None = None
    problem: str | None = None
    objective: str | None = None
    kpi: str | None = None
    description: str | None = None
    industry: str | None = None
    owner: str | None = None
    tags: list[str] | None = None
    archived: bool | None = None
    status: str | None = None


class UseCaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    problem: str
    objective: str
    kpi: str
    description: str
    industry: str
    status: str
    data_source: str | None
    row_count: int | None
    owner: str
    tags: list[str]
    archived: bool
    created_at: datetime
    updated_at: datetime


class UseCaseSummaryOut(UseCaseOut):
    """UseCaseOut plus fields computed from the use case's experiments/strategies
    — used by the Use Case Repository, where every card needs these at a glance."""

    ai_completion_pct: float
    experiment_count: int
    decisions_count: int
    active_strategy_id: str | None
    active_strategy_name: str | None
    current_kpi: float | None
    current_roi: float | None


class ConnectorConfigIn(BaseModel):
    connector_key: str
    kind: str  # "source" | "publish"
    config: dict


class ConnectorConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    use_case_id: str
    connector_key: str
    kind: str
    config: dict
    created_at: datetime


class SimulateRequest(BaseModel):
    price_delta_pct: float = 0.0
    marketing_delta_pct: float = 0.0
    discount_delta_pct: float = 0.0
    inventory_delta_pct: float = 0.0
    inflation_delta_pct: float = 0.0
    demand_delta_pct: float = 0.0
    churn_delta_pct: float = 0.0


class ExperimentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    use_case_id: str
    version_number: int
    status: str
    execution_time_seconds: float | None
    created_by: str
    input_snapshot: dict
    parent_experiment_id: str | None
    created_at: datetime


class StrategyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    use_case_id: str
    experiment_id: str
    parent_strategy_id: str | None
    version_number: int
    decision_key: str
    title: str
    lever: str
    confidence_pct: float
    predicted_revenue_delta: float
    predicted_revenue_delta_pct: float
    risk: str
    estimated_cost: float
    estimated_roi: float | None
    implementation_difficulty: str
    timeline: str
    pros: list[str]
    cons: list[str]
    methodology: str
    lifecycle_status: str
    sandbox_deltas: dict | None
    created_at: datetime
    updated_at: datetime


class StrategyUpdate(BaseModel):
    lifecycle_status: str | None = None


class LockInRequest(BaseModel):
    deltas: SimulateRequest
    name: str | None = None


class MonitoringIn(BaseModel):
    actual_revenue_delta_pct: float
    note: str = ""


class MonitoringOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    strategy_id: str
    expected_revenue_delta_pct: float
    actual_revenue_delta_pct: float
    variance_pct: float
    note: str
    recorded_at: datetime


class WidgetLayoutItem(BaseModel):
    widget_id: str
    order_index: int
    width: int = 1


class WidgetLayoutOut(WidgetLayoutItem):
    model_config = ConfigDict(from_attributes=True)

    id: str
    use_case_id: str
    dashboard_key: str
    updated_at: datetime


class WidgetLayoutPut(BaseModel):
    dashboard_key: str = "executive"
    layout: list[WidgetLayoutItem]


class WidgetConfigIn(BaseModel):
    dashboard_key: str = "executive"
    config: dict
    created_by: str = "user"


class WidgetConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    use_case_id: str
    dashboard_key: str
    widget_id: str
    version_number: int
    config: dict
    created_by: str
    created_at: datetime


class RegisterIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=200)


class LoginIn(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str
    role: str
    created_at: datetime
    last_login_at: datetime | None


class AuthOut(BaseModel):
    token: str
    user: UserOut


class AdminUseCaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    status: str
    data_source: str | None
    row_count: int | None
    archived: bool
    created_at: datetime


class AdminUserOut(BaseModel):
    user: UserOut
    use_case_count: int
    use_cases: list[AdminUseCaseOut]


class ColumnMappingIn(BaseModel):
    # role key -> column name in the uploaded file; omitted/empty = not in my data
    mapping: dict[str, str | None]
