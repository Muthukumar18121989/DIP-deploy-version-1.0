import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Gauge,
  Heart,
  Package,
  Share2,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatTile } from "@/components/dashboard/StatTile";
import { CorrelationHeatmap } from "@/components/dashboard/CorrelationHeatmap";
import { ExportMenu } from "@/components/dashboard/ExportMenu";
import { ConnectorConfigDialog } from "@/components/connectors/ConnectorConfigDialog";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { WidgetChartRenderer, type ChartSeries } from "@/components/dashboard/WidgetChartRenderer";
import { WidgetAIOverlay } from "@/components/dashboard/WidgetAIOverlay";
import { PUBLISH_CONNECTORS } from "@/lib/connectors";
import { CHART_1 } from "@/lib/chartColors";
import { api } from "@/lib/api";
import { useUseCase } from "@/lib/hooks";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { WIDGET_CAPABILITIES, WIDGET_ORDER, type WidgetChanges, type WidgetContext } from "@/lib/widgetTypes";
import type { DashboardData } from "@/lib/types";

const DASHBOARD_KEY = "executive";

function buildWidgetRows(widgetId: string, dashboard: DashboardData): { data: Record<string, string | number | undefined>[]; series: ChartSeries[] } {
  switch (widgetId) {
    case "revenue-trend": {
      const data = [
        ...dashboard.forecast.history.map((h) => ({ period: h.period, actual: h.revenue, forecast: undefined as number | undefined })),
        ...dashboard.forecast.forecast.map((f) => ({ period: f.period, forecast: f.revenue, actual: undefined as number | undefined })),
      ];
      return {
        data,
        series: [
          { key: "actual", color: CHART_1 },
          { key: "forecast", color: "var(--color-accent)", dashed: true },
        ],
      };
    }
    case "revenue-region":
      return {
        data: Object.entries(dashboard.revenue_by_region).map(([region, revenue]) => ({ region, revenue })),
        series: [{ key: "revenue", color: CHART_1 }],
      };
    case "revenue-category":
      return {
        data: Object.entries(dashboard.revenue_by_category).map(([category, revenue]) => ({ category, revenue })),
        series: [{ key: "revenue", color: CHART_1 }],
      };
    case "segment-mix":
      return {
        data: Object.entries(dashboard.segment_mix).map(([segment, revenue]) => ({ segment, revenue })),
        series: [{ key: "revenue", color: CHART_1 }],
      };
    default:
      return { data: [], series: [] };
  }
}

function applySortAndLimit(
  data: Record<string, string | number | undefined>[],
  sort?: { field: string; direction: "ascending" | "descending" },
  limit?: number,
  defaultDescendingByRevenue = false
) {
  let rows = data;
  if (sort) {
    rows = [...rows].sort((a, b) => {
      const av = Number(a[sort.field]) || 0;
      const bv = Number(b[sort.field]) || 0;
      return sort.direction === "ascending" ? av - bv : bv - av;
    });
  } else if (defaultDescendingByRevenue) {
    // Only "Revenue by Region" was pre-sorted before this feature existed —
    // preserve that exactly; other widgets stay in their original order
    // unless the user/AI explicitly requests a sort.
    rows = [...rows].sort((a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0));
  }
  return limit ? rows.slice(0, limit) : rows;
}

export default function Dashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const experimentId = searchParams.get("experimentId") ?? undefined;
  const { data: useCase } = useUseCase(id);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [activeAiWidgetId, setActiveAiWidgetId] = useState<string | null>(null);

  const { data: experiments } = useQuery({
    queryKey: ["experiments", id],
    queryFn: () => api.listExperiments(id!),
    enabled: !!id,
  });

  const { data: dashboard, isError } = useQuery({
    queryKey: ["dashboard", id, experimentId],
    queryFn: () => api.getDashboard(id!, experimentId),
    enabled: !!id,
    retry: false,
  });

  const { data: layoutRows } = useQuery({
    queryKey: ["widget-layout", id],
    queryFn: () => api.getWidgetLayout(id!, DASHBOARD_KEY),
    enabled: !!id,
  });

  const configQueries = useQueries({
    queries: WIDGET_ORDER.map((widgetId) => ({
      queryKey: ["widget-config", id, widgetId],
      queryFn: async () => {
        try {
          return await api.getWidgetConfig(id!, widgetId, DASHBOARD_KEY);
        } catch {
          return null;
        }
      },
      enabled: !!id,
    })),
  });

  const layoutMutation = useMutation({
    mutationFn: (order: string[]) =>
      api.putWidgetLayout(
        id!,
        order.map((widgetId, i) => ({
          widget_id: widgetId,
          order_index: i,
          width: widgetByWidthDefault(widgetId, layoutRows),
        })),
        DASHBOARD_KEY
      ),
    onSuccess: (rows) => queryClient.setQueryData(["widget-layout", id], rows),
  });

  if (!id) return null;

  if (isError) {
    return (
      <AppShell useCaseId={id} useCaseName={useCase?.name} title="Executive Dashboard">
        <Card className="mx-auto max-w-lg p-6 text-center">
          <p className="text-sm text-foreground-muted">Run the AI pipeline first to populate the dashboard.</p>
          <Button className="mt-4" onClick={() => navigate(`/use-cases/${id}/pipeline`)}>
            Go to AI Pipeline <ArrowRight className="size-4" />
          </Button>
        </Card>
      </AppShell>
    );
  }

  if (!dashboard) return null;

  const orderedWidgetIds =
    layoutRows && layoutRows.length > 0 ? [...layoutRows].sort((a, b) => a.order_index - b.order_index).map((r) => r.widget_id) : WIDGET_ORDER;

  const configByWidget: Record<string, WidgetChanges> = {};
  WIDGET_ORDER.forEach((widgetId, i) => {
    configByWidget[widgetId] = (configQueries[i]?.data?.config as WidgetChanges) ?? {};
  });

  async function applyWidgetChanges(widgetId: string, changes: WidgetChanges) {
    const merged = { ...configByWidget[widgetId], ...changes };
    await api.createWidgetConfigVersion(id!, widgetId, merged, "ai", DASHBOARD_KEY);
    queryClient.invalidateQueries({ queryKey: ["widget-config", id, widgetId] });
  }

  async function resetWidget(widgetId: string) {
    await api.createWidgetConfigVersion(id!, widgetId, {}, "ai", DASHBOARD_KEY);
    queryClient.invalidateQueries({ queryKey: ["widget-config", id, widgetId] });
  }

  async function undoWidget(widgetId: string) {
    await api.undoWidgetConfig(id!, widgetId, DASHBOARD_KEY);
    queryClient.invalidateQueries({ queryKey: ["widget-config", id, widgetId] });
  }

  function handleDrop(targetWidgetId: string) {
    setDropTargetId(null);
    if (!draggingId || draggingId === targetWidgetId) {
      setDraggingId(null);
      return;
    }
    const current = [...orderedWidgetIds];
    const fromIdx = current.indexOf(draggingId);
    const toIdx = current.indexOf(targetWidgetId);
    if (fromIdx === -1 || toIdx === -1) {
      setDraggingId(null);
      return;
    }
    current.splice(fromIdx, 1);
    current.splice(toIdx, 0, draggingId);
    layoutMutation.mutate(current);
    setDraggingId(null);
  }

  return (
    <AppShell useCaseId={id} useCaseName={useCase?.name} title="Executive Dashboard">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{useCase?.name}</h2>
            <p className="text-sm text-foreground-muted">Live view, computed from your trained model and dataset.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {experiments && experiments.length > 1 && (
              <select
                value={experimentId ?? experiments.find((e) => e.status === "complete")?.id ?? ""}
                onChange={(e) => setSearchParams({ experimentId: e.target.value })}
                className="h-9 rounded-md border border-border bg-surface px-2 text-xs text-foreground"
              >
                {experiments
                  .filter((e) => e.status === "complete")
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      Version {e.version_number}
                    </option>
                  ))}
              </select>
            )}
            <ExportMenu dashboard={dashboard} useCaseName={useCase?.name ?? "use-case"} captureElementId="dashboard-export-capture" />
          </div>
        </div>

        <div id="dashboard-export-capture">
          {dashboard.top_decision && (
            <Card className="mb-6 border-primary/30 bg-primary/5 p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">Top recommendation</p>
                  <p className="mt-1 text-sm text-foreground">
                    {dashboard.top_decision.title} — projected{" "}
                    {formatPercent(dashboard.top_decision.predicted_revenue_delta_pct, { signed: true })} revenue impact
                    with {dashboard.top_decision.confidence_pct}% model confidence.
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Total Revenue" value={formatCurrency(dashboard.kpis.total_revenue, { compact: true })} icon={DollarSign} />
            <StatTile label="Orders" value={dashboard.kpis.total_orders.toLocaleString()} icon={ShoppingCart} />
            <StatTile label="Avg Order Value" value={formatCurrency(dashboard.kpis.avg_order_value)} icon={Package} />
            <StatTile
              label="Stockout Rate"
              value={`${dashboard.kpis.stockout_rate_pct}%`}
              icon={AlertTriangle}
              tone={dashboard.kpis.stockout_rate_pct > 10 ? "critical" : "default"}
            />
            <StatTile
              label="Churn Rate"
              value={`${dashboard.kpis.churn_rate_pct}%`}
              icon={Heart}
              tone={dashboard.kpis.churn_rate_pct > 10 ? "warning" : "default"}
            />
            <StatTile label="Data Quality" value={`${dashboard.kpis.data_quality_score}/100`} icon={Gauge} tone="good" />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {orderedWidgetIds.map((widgetId) => {
              const capability = WIDGET_CAPABILITIES[widgetId];
              if (!capability) return null;
              const config = configByWidget[widgetId] ?? {};
              const width = widgetByWidthDefault(widgetId, layoutRows);
              const title = config.title ?? capability.title;
              const history = configQueries[WIDGET_ORDER.indexOf(widgetId)]?.data;
              const canUndo = !!history && history.version_number > 1;

              const context: WidgetContext = {
                widgetId,
                widgetTitle: title,
                chartType: config.chartType ?? capability.defaultChartType,
                dataset: capability.dataset,
                xAxis: config.xAxis ?? capability.defaultXAxis,
                yAxis: config.yAxis ?? capability.defaultYAxis,
                filters: config.filters ?? [],
                dimensions: capability.dimensions,
                measures: capability.measures,
                sorting: config.sort,
                aggregation: config.aggregation,
                dashboardId: DASHBOARD_KEY,
                useCaseId: id,
              };

              return (
                <DashboardWidget
                  key={widgetId}
                  widgetId={widgetId}
                  title={title}
                  isDragging={draggingId === widgetId}
                  isDropTarget={dropTargetId === widgetId && draggingId !== widgetId}
                  aiActive={activeAiWidgetId === widgetId}
                  className={width === 2 ? "lg:col-span-2" : undefined}
                  onDragStart={setDraggingId}
                  onDragOver={setDropTargetId}
                  onDrop={handleDrop}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDropTargetId(null);
                  }}
                  onAiToggle={() => setActiveAiWidgetId((prev) => (prev === widgetId ? null : widgetId))}
                >
                  <CardHeader>
                    <div>
                      <CardTitle>{title}</CardTitle>
                      <CardDescription>{widgetSubtitle(widgetId)}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className={widgetId === "segment-mix" ? "flex items-center justify-center" : undefined}>
                    {widgetId === "correlation" ? (
                      <CorrelationHeatmap correlation={dashboard.correlation} />
                    ) : (
                      (() => {
                        const { data, series } = buildWidgetRows(widgetId, dashboard);
                        const xKey = context.xAxis ?? capability.defaultXAxis ?? "";
                        return (
                          <WidgetChartRenderer
                            chartType={context.chartType}
                            data={applySortAndLimit(data, config.sort, config.limit, widgetId === "revenue-region")}
                            xKey={xKey}
                            series={series}
                            showLegend={config.showLegend ?? widgetId === "segment-mix"}
                            showGrid={config.showGrid ?? true}
                            xAxisAngled={widgetId !== "revenue-trend"}
                          />
                        );
                      })()
                    )}
                  </CardContent>

                  <AnimatePresence>
                    {activeAiWidgetId === widgetId && (
                      <WidgetAIOverlay
                        context={context}
                        canUndo={canUndo}
                        onClose={() => setActiveAiWidgetId(null)}
                        onApply={(changes) => applyWidgetChanges(widgetId, changes)}
                        onReset={() => resetWidget(widgetId)}
                        onUndo={() => undoWidget(widgetId)}
                      />
                    )}
                  </AnimatePresence>
                </DashboardWidget>
              );
            })}
          </div>
        </div>

        <div className="mb-4 mt-8 flex items-center gap-2">
          <Share2 className="size-4 text-foreground-muted" />
          <h2 className="text-sm font-semibold text-foreground">Ship to business</h2>
          <span className="text-xs text-foreground-subtle">
            Configuration is saved for reference — no live delivery happens in this environment.
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {PUBLISH_CONNECTORS.map((connector) => (
            <ConnectorConfigDialog
              key={connector.key}
              useCaseId={id}
              connector={connector}
              kind="publish"
              trigger={
                <button className="flex w-full flex-col items-start gap-1.5 rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-border-strong hover:bg-surface-hover">
                  <span className="text-xs font-medium text-foreground-subtle">{connector.category}</span>
                  <span className="text-sm font-medium text-foreground">{connector.label}</span>
                </button>
              }
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function widgetByWidthDefault(widgetId: string, layoutRows: { widget_id: string; width: number }[] | undefined): number {
  const saved = layoutRows?.find((r) => r.widget_id === widgetId);
  if (saved) return saved.width;
  return widgetId === "correlation" ? 2 : 1;
}

function widgetSubtitle(widgetId: string): string {
  switch (widgetId) {
    case "revenue-trend":
      return "Actual monthly revenue, with a 3-month ARIMA forecast";
    case "revenue-region":
      return "Sorted highest to lowest";
    case "revenue-category":
      return "Sized by share of total revenue";
    case "segment-mix":
      return "Share of revenue by segment";
    case "correlation":
      return "How key metrics move together (blue = negative, red = positive)";
    default:
      return "";
  }
}

