export type UseCaseStatus =
  | "created"
  | "needs_mapping"
  | "data_ready"
  | "pipeline_running"
  | "pipeline_complete"
  | "pipeline_error";

export interface UseCase {
  id: string;
  name: string;
  problem: string;
  objective: string;
  kpi: string;
  description: string;
  industry: string;
  status: UseCaseStatus;
  data_source: string | null;
  row_count: number | null;
  owner: string;
  tags: string[];
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface UseCaseSummary extends UseCase {
  ai_completion_pct: number;
  experiment_count: number;
  decisions_count: number;
  active_strategy_id: string | null;
  active_strategy_name: string | null;
  current_kpi: number | null;
  current_roi: number | null;
}

export interface ColumnProfile {
  column: string;
  classification: string;
  dtype: string;
  missing_count: number;
  missing_pct: number;
  unique_count: number;
  outlier_count?: number;
  outlier_pct?: number;
  mean?: number;
  median?: number;
  std?: number;
  min?: number;
  max?: number;
  top_values?: { value: string; count: number }[];
}

export interface DataProfile {
  row_count: number;
  column_count: number;
  duplicate_rows: number;
  data_quality_score: number;
  columns: ColumnProfile[];
  correlation: Record<string, Record<string, number | null>>;
  summary_plain_english: string;
}

export interface ModelComparisonRow {
  model: string;
  cv_r2_mean: number;
  cv_r2_std: number;
  cv_mae_mean: number;
  test_r2: number;
  test_mae: number;
  test_mape: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface TrainingResult {
  comparison: ModelComparisonRow[];
  best_model_name: string;
  feature_importances: FeatureImportance[];
}

export interface Decision {
  id: string;
  title: string;
  lever: string;
  confidence_pct: number;
  predicted_revenue_delta: number;
  predicted_revenue_delta_pct: number;
  risk: "Low" | "Medium" | "High";
  estimated_cost: number;
  estimated_roi: number | null;
  implementation_difficulty: string;
  timeline: string;
  pros: string[];
  cons: string[];
  methodology: string;
  deltas?: Record<string, number>;
  regions?: string[] | null;
}

export interface MappingRole {
  key: string;
  label: string;
  group: "time" | "kpi" | "dimension" | "lever" | "driver";
  kind: "date" | "number" | "category" | "flag" | "id";
  help: string;
  required: boolean;
}

export interface UploadResult {
  row_count: number;
  columns: string[];
  schema_match: boolean;
  needs_mapping: boolean;
  suggested_mapping?: Record<string, string>;
  roles?: MappingRole[];
  message: string;
}

export interface MappingScreen {
  columns: string[];
  samples: Record<string, string[]>;
  row_count: number;
  roles: MappingRole[];
  suggested_mapping: Record<string, string>;
  current_mapping: Record<string, string> | null;
}

export interface MappingResult {
  row_count: number;
  month_count: number;
  available: string[];
  message: string;
}

export interface ForecastPoint {
  period: string;
  revenue: number;
  lower?: number;
  upper?: number;
}

export interface Forecast {
  history: ForecastPoint[];
  forecast: ForecastPoint[];
}

export interface DashboardData {
  kpis: {
    total_revenue: number;
    total_orders: number;
    avg_order_value: number;
    // null when the dataset has no such column (see column mapping)
    stockout_rate_pct: number | null;
    churn_rate_pct: number | null;
    avg_satisfaction: number | null;
    data_quality_score: number;
  };
  revenue_by_region: Record<string, number>;
  revenue_by_category: Record<string, number>;
  monthly_trend: { period: string; revenue: number }[];
  segment_mix: Record<string, number>;
  channel_mix: Record<string, number>;
  correlation: Record<string, Record<string, number | null>>;
  top_decision: Decision | null;
  forecast: Forecast;
}

/** Replay of a past run, used to restore the pipeline view after a reload. */
export interface PipelineEventsReplay {
  experiment_id: string;
  status: "running" | "complete" | "error";
  events: PipelineEvent[];
}

export interface PipelineEvent {
  stage: string;
  label?: string;
  status: "running" | "complete" | "error";
  what_happened: string;
  why?: string;
  ai_doing?: string;
  data?: unknown;
}

export interface SimulateDeltas {
  price_delta_pct?: number;
  marketing_delta_pct?: number;
  discount_delta_pct?: number;
  inventory_delta_pct?: number;
  inflation_delta_pct?: number;
  demand_delta_pct?: number;
  churn_delta_pct?: number;
}

export interface SimulateResult {
  baseline_revenue: number;
  predicted_revenue: number;
  predicted_revenue_delta: number;
  predicted_revenue_delta_pct: number;
  revenue_by_region: Record<string, number>;
  baseline_revenue_by_region: Record<string, number>;
  deltas_applied: SimulateDeltas;
}

export interface ConnectorConfig {
  id: string;
  use_case_id: string;
  connector_key: string;
  kind: "source" | "publish";
  config: Record<string, unknown>;
  created_at: string;
}

export interface Experiment {
  id: string;
  use_case_id: string;
  version_number: number;
  status: "running" | "complete" | "error";
  execution_time_seconds: number | null;
  created_by: string;
  input_snapshot: Record<string, unknown>;
  parent_experiment_id: string | null;
  created_at: string;
}

export interface ExperimentDetail {
  profiling: DataProfile | null;
  training: TrainingResult | null;
  decisions: Decision[] | null;
  forecast: Forecast | null;
  dashboard: DashboardData | null;
}

export type StrategyLifecycleStatus =
  | "generated"
  | "reviewed"
  | "sandbox_tested"
  | "locked_in"
  | "approved"
  | "published"
  | "monitoring"
  | "archived";

export interface Strategy {
  id: string;
  use_case_id: string;
  experiment_id: string;
  parent_strategy_id: string | null;
  version_number: number;
  decision_key: string;
  title: string;
  lever: string;
  confidence_pct: number;
  predicted_revenue_delta: number;
  predicted_revenue_delta_pct: number;
  risk: "Low" | "Medium" | "High";
  estimated_cost: number;
  estimated_roi: number | null;
  implementation_difficulty: string;
  timeline: string;
  pros: string[];
  cons: string[];
  methodology: string;
  lifecycle_status: StrategyLifecycleStatus;
  sandbox_deltas: SimulateDeltas | null;
  created_at: string;
  updated_at: string;
}

export interface StrategyReport {
  strategy: Strategy;
  profiling: DataProfile | null;
  training: TrainingResult | null;
  forecast: Forecast | null;
  dashboard: DashboardData | null;
}

export interface MonitoringSnapshot {
  id: string;
  strategy_id: string;
  expected_revenue_delta_pct: number;
  actual_revenue_delta_pct: number;
  variance_pct: number;
  note: string;
  recorded_at: string;
}

export interface WidgetLayoutItem {
  widget_id: string;
  order_index: number;
  width: number;
}

export interface WidgetLayoutRow extends WidgetLayoutItem {
  id: string;
  use_case_id: string;
  dashboard_key: string;
  updated_at: string;
}

export interface WidgetConfigRow {
  id: string;
  use_case_id: string;
  dashboard_key: string;
  widget_id: string;
  version_number: number;
  config: Record<string, unknown>;
  created_by: "user" | "ai";
  created_at: string;
}

export type UserRole = "user" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  last_login_at: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AdminUseCase {
  id: string;
  name: string;
  status: string;
  data_source: string | null;
  row_count: number | null;
  archived: boolean;
  created_at: string;
}

export interface AdminUser {
  user: User;
  use_case_count: number;
  use_cases: AdminUseCase[];
}
