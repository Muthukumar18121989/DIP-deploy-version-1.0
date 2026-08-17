import type { WidgetCapability, WidgetChanges } from "./widgetTypes";

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  availableFields?: string[];
  availableChartTypes?: string[];
}

function fieldExists(field: string, capability: WidgetCapability): boolean {
  return capability.dimensions.includes(field) || capability.measures.includes(field);
}

/** Capability validation: rejects any AI/user-requested change that
 * references a field or chart type the widget's real data doesn't have —
 * the AI must never invent fields or force an unsupported visualization. */
export function validateWidgetChanges(changes: WidgetChanges, capability: WidgetCapability): ValidationResult {
  const availableFields = [...capability.dimensions, ...capability.measures];

  if (changes.chartType && !capability.allowedChartTypes.includes(changes.chartType)) {
    return {
      valid: false,
      reason: `"${capability.title}" doesn't support ${changes.chartType} charts.`,
      availableChartTypes: capability.allowedChartTypes,
    };
  }

  const fieldsToCheck: (string | undefined)[] = [
    changes.xAxis,
    changes.yAxis,
    changes.groupBy,
    changes.sort?.field,
    ...(changes.filters?.map((f) => f.field) ?? []),
  ];

  for (const field of fieldsToCheck) {
    if (field && !fieldExists(field, capability)) {
      return {
        valid: false,
        reason: `"${field}" isn't available in this widget's data.`,
        availableFields,
      };
    }
  }

  if (changes.limit !== undefined && changes.limit <= 0) {
    return { valid: false, reason: "The limit must be a positive number." };
  }

  return { valid: true };
}
