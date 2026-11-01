import type {
  AdminUser,
  AuthResponse,
  ConnectorConfig,
  DashboardData,
  DataProfile,
  Decision,
  Experiment,
  ExperimentDetail,
  MappingResult,
  MappingScreen,
  UploadResult,
  MonitoringSnapshot,
  PipelineEventsReplay,
  SimulateDeltas,
  SimulateResult,
  Strategy,
  StrategyLifecycleStatus,
  StrategyReport,
  TrainingResult,
  UseCase,
  UseCaseSummary,
  User,
  WidgetConfigRow,
  WidgetLayoutItem,
  WidgetLayoutRow,
} from "./types";
import { getToken, setToken } from "./authToken";

// In local dev, "/api" is proxied to the backend by vite.config.ts. In a
// split deployment (frontend and backend on different hosts), set
// VITE_API_URL to the backend's public URL (e.g. https://dip-api.onrender.com/api).
const BASE = import.meta.env.VITE_API_URL || "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = init?.body instanceof FormData ? {} : { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...init,
  });
  if (res.status === 401 && token && !path.startsWith("/auth/")) {
    // The session expired or was revoked: drop it and send the user to sign
    // in again, rather than leaving every page showing "Not authenticated".
    setToken(null);
    localStorage.removeItem("dip-auth-store");
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`/login?redirect=${redirect}`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function withExperiment(path: string, experimentId?: string): string {
  return experimentId ? `${path}?experiment_id=${experimentId}` : path;
}

export interface CreateUseCasePayload {
  name: string;
  problem: string;
  objective: string;
  kpi: string;
  description: string;
  industry?: string;
}

export interface UpdateUseCasePayload {
  name?: string;
  problem?: string;
  objective?: string;
  kpi?: string;
  description?: string;
  industry?: string;
  owner?: string;
  tags?: string[];
  archived?: boolean;
  status?: string;
}

export const api = {
  createUseCase: (payload: CreateUseCasePayload) =>
    request<UseCase>("/use-cases", { method: "POST", body: JSON.stringify(payload) }),

  listUseCases: () => request<UseCaseSummary[]>("/use-cases"),

  getUseCase: (id: string) => request<UseCase>(`/use-cases/${id}`),

  updateUseCase: (id: string, payload: UpdateUseCasePayload) =>
    request<UseCase>(`/use-cases/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  duplicateUseCase: (id: string) => request<UseCase>(`/use-cases/${id}/duplicate`, { method: "POST" }),

  deleteUseCase: (id: string) => request<void>(`/use-cases/${id}`, { method: "DELETE" }),

  generateData: (id: string) =>
    request<{ row_count: number; columns: string[]; shocked_regions: string[]; message: string }>(
      `/use-cases/${id}/data/generate`,
      { method: "POST" }
    ),

  uploadData: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<UploadResult>(`/use-cases/${id}/data/upload`, { method: "POST", body: form });
  },

  getMapping: (id: string) => request<MappingScreen>(`/use-cases/${id}/data/mapping`),

  saveMapping: (id: string, mapping: Record<string, string | null>) =>
    request<MappingResult>(`/use-cases/${id}/data/mapping`, {
      method: "POST",
      body: JSON.stringify({ mapping }),
    }),

  getDataQuality: (id: string) => request<DataProfile>(`/use-cases/${id}/data/quality`),

  getDecisions: (id: string, experimentId?: string) =>
    request<Decision[]>(withExperiment(`/use-cases/${id}/decisions`, experimentId)),

  getDashboard: (id: string, experimentId?: string) =>
    request<DashboardData>(withExperiment(`/use-cases/${id}/dashboard`, experimentId)),

  getTraining: (id: string, experimentId?: string) =>
    request<TrainingResult>(withExperiment(`/use-cases/${id}/training`, experimentId)),

  simulate: (id: string, deltas: SimulateDeltas, experimentId?: string) =>
    request<SimulateResult>(withExperiment(`/use-cases/${id}/simulate`, experimentId), {
      method: "POST",
      body: JSON.stringify(deltas),
    }),

  listConnectors: (id: string) => request<ConnectorConfig[]>(`/use-cases/${id}/connectors`),

  upsertConnector: (id: string, connectorKey: string, kind: "source" | "publish", config: Record<string, unknown>) =>
    request<ConnectorConfig>(`/use-cases/${id}/connectors`, {
      method: "PUT",
      body: JSON.stringify({ connector_key: connectorKey, kind, config }),
    }),

  // EventSource can't send an Authorization header, so the stream is the one
  // request that carries the session token in the URL.
  pipelineStreamUrl: (id: string) =>
    `${BASE}/use-cases/${id}/pipeline/stream?token=${encodeURIComponent(getToken() ?? "")}`,

  getPipelineEvents: (id: string, experimentId?: string) =>
    request<PipelineEventsReplay>(withExperiment(`/use-cases/${id}/pipeline/events`, experimentId)),

  listExperiments: (useCaseId: string) => request<Experiment[]>(`/use-cases/${useCaseId}/experiments`),

  getExperiment: (experimentId: string) => request<Experiment>(`/experiments/${experimentId}`),

  getExperimentDetail: (experimentId: string) =>
    request<ExperimentDetail>(`/experiments/${experimentId}/detail`),

  listStrategies: (useCaseId: string) => request<Strategy[]>(`/use-cases/${useCaseId}/strategies`),

  getStrategy: (strategyId: string) => request<Strategy>(`/strategies/${strategyId}`),

  getStrategyReport: (strategyId: string) => request<StrategyReport>(`/strategies/${strategyId}/report`),

  updateStrategy: (strategyId: string, lifecycle_status: StrategyLifecycleStatus) =>
    request<Strategy>(`/strategies/${strategyId}`, {
      method: "PATCH",
      body: JSON.stringify({ lifecycle_status }),
    }),

  duplicateStrategy: (strategyId: string) =>
    request<Strategy>(`/strategies/${strategyId}/duplicate`, { method: "POST" }),

  compareStrategies: (ids: string[]) => request<Strategy[]>(`/strategies/compare?ids=${ids.join(",")}`),

  lockInStrategy: (strategyId: string, deltas: SimulateDeltas, name?: string) =>
    request<Strategy>(`/strategies/${strategyId}/lock-in`, {
      method: "POST",
      body: JSON.stringify({ deltas, name }),
    }),

  listMonitoring: (strategyId: string) =>
    request<MonitoringSnapshot[]>(`/strategies/${strategyId}/monitoring`),

  recordMonitoring: (strategyId: string, actual_revenue_delta_pct: number, note: string) =>
    request<MonitoringSnapshot>(`/strategies/${strategyId}/monitoring`, {
      method: "POST",
      body: JSON.stringify({ actual_revenue_delta_pct, note }),
    }),

  getWidgetLayout: (useCaseId: string, dashboardKey = "executive") =>
    request<WidgetLayoutRow[]>(`/use-cases/${useCaseId}/widget-layout?dashboard_key=${dashboardKey}`),

  putWidgetLayout: (useCaseId: string, layout: WidgetLayoutItem[], dashboardKey = "executive") =>
    request<WidgetLayoutRow[]>(`/use-cases/${useCaseId}/widget-layout`, {
      method: "PUT",
      body: JSON.stringify({ dashboard_key: dashboardKey, layout }),
    }),

  getWidgetConfig: (useCaseId: string, widgetId: string, dashboardKey = "executive") =>
    request<WidgetConfigRow>(`/use-cases/${useCaseId}/widgets/${widgetId}/config?dashboard_key=${dashboardKey}`),

  createWidgetConfigVersion: (
    useCaseId: string,
    widgetId: string,
    config: Record<string, unknown>,
    createdBy: "user" | "ai" = "user",
    dashboardKey = "executive"
  ) =>
    request<WidgetConfigRow>(`/use-cases/${useCaseId}/widgets/${widgetId}/config`, {
      method: "POST",
      body: JSON.stringify({ dashboard_key: dashboardKey, config, created_by: createdBy }),
    }),

  getWidgetConfigHistory: (useCaseId: string, widgetId: string, dashboardKey = "executive") =>
    request<WidgetConfigRow[]>(`/use-cases/${useCaseId}/widgets/${widgetId}/config/history?dashboard_key=${dashboardKey}`),

  undoWidgetConfig: (useCaseId: string, widgetId: string, dashboardKey = "executive") =>
    request<WidgetConfigRow>(`/use-cases/${useCaseId}/widgets/${widgetId}/config/undo?dashboard_key=${dashboardKey}`, {
      method: "POST",
    }),

  register: (email: string, name: string, password: string) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ email, name, password }) }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  logout: () => request<void>("/auth/logout", { method: "POST" }),

  me: () => request<User>("/auth/me"),

  listAdminUsers: () => request<AdminUser[]>("/admin/users"),
};
