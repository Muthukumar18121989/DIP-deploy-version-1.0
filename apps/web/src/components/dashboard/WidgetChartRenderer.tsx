import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORICAL, CHART_1 } from "@/lib/chartColors";
import { formatCurrency, formatTooltipCurrency } from "@/lib/utils";
import type { ChartType } from "@/lib/widgetTypes";

export interface ChartSeries {
  key: string;
  color: string;
  dashed?: boolean;
}

export interface WidgetChartRendererProps {
  chartType: ChartType;
  data: Record<string, string | number | undefined>[];
  xKey: string;
  series: ChartSeries[];
  showLegend?: boolean;
  showGrid?: boolean;
  height?: number;
  /** True for categorical axes (region/category/segment) with few, often
   * long labels — angles them so all of them stay legible. False for
   * dense time-series axes (period), which rely on tick interval spacing
   * instead. */
  xAxisAngled?: boolean;
}

const gridProps = { stroke: "var(--color-border)", strokeDasharray: "3 3" };
const axisTick = { fill: "var(--color-foreground-muted)", fontSize: 10 };
const tooltipStyle = { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 };

/** The one place chart-type switching actually happens — driven entirely by
 * the widget's applied WidgetConfig, so "change this to a line chart" from
 * the AI genuinely re-renders a different Recharts component, not a label. */
export function WidgetChartRenderer({ chartType, data, xKey, series, showLegend = false, showGrid = true, height = 260, xAxisAngled = false }: WidgetChartRendererProps) {
  const xAxisProps = xAxisAngled ? { angle: -20, textAnchor: "end" as const, height: 50, interval: 0 as const } : {};
  if (chartType === "table") {
    return (
      <div className="max-h-64 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-foreground-subtle">
              <th className="pb-1.5 pr-3 font-medium">{xKey}</th>
              {series.map((s) => (
                <th key={s.key} className="pb-1.5 pr-3 font-medium">
                  {s.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-1.5 pr-3 text-foreground-muted">{row[xKey]}</td>
                {series.map((s) => (
                  <td key={s.key} className="py-1.5 pr-3 font-medium text-foreground">
                    {typeof row[s.key] === "number" ? (row[s.key] as number).toLocaleString() : (row[s.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (chartType === "pie" || chartType === "donut") {
    const valueKey = series[0]?.key ?? "value";
    const pieData = data.map((d, i) => ({ name: String(d[xKey]), value: Number(d[valueKey]) || 0, fill: CATEGORICAL[i % CATEGORICAL.length] }));
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={chartType === "donut" ? 55 : 0} outerRadius={90} paddingAngle={2}>
            {pieData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          {showLegend && (
            <Legend verticalAlign="bottom" formatter={(value) => <span style={{ color: "var(--color-foreground-muted)", fontSize: 12 }}>{value}</span>} />
          )}
          <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipCurrency} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "treemap") {
    const valueKey = series[0]?.key ?? "value";
    const treemapData = data.map((d, i) => ({ name: String(d[xKey]), size: Number(d[valueKey]) || 0, fill: CATEGORICAL[i % CATEGORICAL.length] }));
    return (
      <ResponsiveContainer width="100%" height={height}>
        <Treemap data={treemapData} dataKey="size" stroke="var(--color-background)" fill={CHART_1}>
          <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipCurrency} />
        </Treemap>
      </ResponsiveContainer>
    );
  }

  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ left: -20 }}>
          {showGrid && <CartesianGrid {...gridProps} vertical={false} />}
          <XAxis dataKey={xKey} tick={axisTick} {...xAxisProps} />
          <YAxis tick={axisTick} tickFormatter={(v) => formatCurrency(v, { compact: true })} />
          <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipCurrency} />
          {showLegend && <Legend />}
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "5 4" : undefined} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "area") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ left: -20 }}>
          {showGrid && <CartesianGrid {...gridProps} vertical={false} />}
          <XAxis dataKey={xKey} tick={axisTick} {...xAxisProps} />
          <YAxis tick={axisTick} tickFormatter={(v) => formatCurrency(v, { compact: true })} />
          <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipCurrency} />
          {showLegend && <Legend />}
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} fill={s.color} fillOpacity={0.15} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // bar (default)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -20 }}>
        {showGrid && <CartesianGrid {...gridProps} vertical={false} />}
        <XAxis dataKey={xKey} tick={axisTick} angle={-20} textAnchor="end" height={50} />
        <YAxis tick={axisTick} tickFormatter={(v) => formatCurrency(v, { compact: true })} />
        <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipCurrency} />
        {showLegend && <Legend />}
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
