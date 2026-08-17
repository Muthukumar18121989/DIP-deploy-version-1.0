/** Structured widget configuration types — the AI (or a user) can only ever
 * produce a `WidgetChanges` object, never touch a component/DOM/chart
 * library directly. See widgetValidation.ts for the capability checks that
 * gate applying one. */

export const SUPPORTED_CHART_TYPES = ["bar", "line", "area", "pie", "donut", "treemap", "table"] as const;
export type ChartType = (typeof SUPPORTED_CHART_TYPES)[number];

export interface WidgetFilter {
  field: string;
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
  value: string | number;
}

export interface WidgetSort {
  field: string;
  direction: "ascending" | "descending";
}

/** Everything an AI-or-user change can touch. A persisted WidgetConfig is
 * just the accumulated result of these fields. */
export interface WidgetChanges {
  chartType?: ChartType;
  title?: string;
  xAxis?: string;
  yAxis?: string;
  filters?: WidgetFilter[];
  sort?: WidgetSort;
  limit?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  aggregation?: "sum" | "avg" | "count" | "min" | "max";
  groupBy?: string;
}

export type WidgetConfigData = WidgetChanges;

export type WidgetAction = "update_chart" | "reset_widget";

export interface WidgetCommand {
  action: WidgetAction;
  widgetId: string;
  changes?: WidgetChanges;
}

/** What the AI (or any future interpreter) is given so it can never guess
 * or operate on the wrong widget. */
export interface WidgetContext {
  widgetId: string;
  widgetTitle: string;
  chartType: ChartType;
  dataset: string;
  xAxis?: string;
  yAxis?: string;
  filters: WidgetFilter[];
  dimensions: string[];
  measures: string[];
  sorting?: WidgetSort;
  aggregation?: string;
  dashboardId: string;
  useCaseId: string;
}

export interface WidgetCapability {
  widgetId: string;
  title: string;
  dataset: string;
  dimensions: string[];
  measures: string[];
  allowedChartTypes: ChartType[];
  defaultChartType: ChartType;
  defaultXAxis?: string;
  defaultYAxis?: string;
}

/** The real, fixed shape of each dashboard widget's underlying data — this
 * is what capability validation checks AI/user requests against, so a
 * request for a field or chart type that doesn't exist is rejected instead
 * of silently doing nothing (or something wrong). */
export const WIDGET_CAPABILITIES: Record<string, WidgetCapability> = {
  "revenue-trend": {
    widgetId: "revenue-trend",
    title: "Revenue trend & forecast",
    dataset: "dashboard.forecast",
    dimensions: ["period"],
    measures: ["revenue"],
    allowedChartTypes: ["area", "line", "bar", "table"],
    defaultChartType: "area",
    defaultXAxis: "period",
    defaultYAxis: "revenue",
  },
  "revenue-region": {
    widgetId: "revenue-region",
    title: "Revenue by region",
    dataset: "dashboard.revenue_by_region",
    dimensions: ["region"],
    measures: ["revenue"],
    allowedChartTypes: ["bar", "line", "area", "table"],
    defaultChartType: "bar",
    defaultXAxis: "region",
    defaultYAxis: "revenue",
  },
  "revenue-category": {
    widgetId: "revenue-category",
    title: "Revenue by category",
    dataset: "dashboard.revenue_by_category",
    dimensions: ["category"],
    measures: ["revenue"],
    allowedChartTypes: ["treemap", "bar", "table"],
    defaultChartType: "treemap",
    defaultXAxis: "category",
    defaultYAxis: "revenue",
  },
  "segment-mix": {
    widgetId: "segment-mix",
    title: "Customer segment mix",
    dataset: "dashboard.segment_mix",
    dimensions: ["segment"],
    measures: ["revenue"],
    allowedChartTypes: ["donut", "pie", "bar", "table"],
    defaultChartType: "donut",
    defaultXAxis: "segment",
    defaultYAxis: "revenue",
  },
  correlation: {
    widgetId: "correlation",
    title: "Correlation heatmap",
    dataset: "dashboard.correlation",
    dimensions: [],
    measures: [],
    allowedChartTypes: ["table"],
    defaultChartType: "table",
  },
};

export const WIDGET_ORDER = ["revenue-trend", "revenue-region", "revenue-category", "segment-mix", "correlation"];
