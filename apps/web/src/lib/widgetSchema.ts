import { z } from "zod";
import { SUPPORTED_CHART_TYPES } from "./widgetTypes";

export const WidgetFilterSchema = z.object({
  field: z.string().min(1),
  op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte"]),
  value: z.union([z.string(), z.number()]),
});

export const WidgetSortSchema = z.object({
  field: z.string().min(1),
  direction: z.enum(["ascending", "descending"]),
});

export const WidgetChangesSchema = z
  .object({
    chartType: z.enum(SUPPORTED_CHART_TYPES).optional(),
    title: z.string().min(1).max(80).optional(),
    xAxis: z.string().min(1).optional(),
    yAxis: z.string().min(1).optional(),
    filters: z.array(WidgetFilterSchema).optional(),
    sort: WidgetSortSchema.optional(),
    limit: z.number().int().positive().max(50).optional(),
    showLegend: z.boolean().optional(),
    showGrid: z.boolean().optional(),
    aggregation: z.enum(["sum", "avg", "count", "min", "max"]).optional(),
    groupBy: z.string().min(1).optional(),
  })
  .strict();

export const WidgetCommandSchema = z.object({
  action: z.enum(["update_chart", "reset_widget"]),
  widgetId: z.string().min(1),
  changes: WidgetChangesSchema.optional(),
});

export type WidgetCommandParsed = z.infer<typeof WidgetCommandSchema>;

export function parseWidgetCommand(input: unknown) {
  return WidgetCommandSchema.safeParse(input);
}
