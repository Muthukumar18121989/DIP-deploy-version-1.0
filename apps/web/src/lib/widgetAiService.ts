/** Widget AI service — the ONLY place natural language ever gets turned
 * into a structured WidgetCommand. Nothing else in the app calls an LLM or
 * touches chart/DOM internals; this function's contract
 * (instruction + context + history -> AiInterpretResult) is what a real
 * provider (Claude/OpenAI/Azure/local) would implement later without any
 * change to the UI that calls it.
 *
 * There's no LLM API key available in this environment, so this is a real,
 * deterministic, rule-based interpreter — not a stub that fakes a response.
 * It genuinely parses the instruction and produces (or rejects) a command;
 * it's just pattern-matching instead of a model doing the matching.
 */

import type { ChartType, WidgetChanges, WidgetCommand, WidgetContext } from "./widgetTypes";
import { SUPPORTED_CHART_TYPES } from "./widgetTypes";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type AiInterpretResult =
  | { type: "command"; command: WidgetCommand; explanation: string; requiresConfirmation: boolean }
  | { type: "clarify"; message: string; options?: string[] }
  | { type: "unrecognized"; message: string };

const FIELD_SYNONYMS: Record<string, string> = {
  month: "period",
  months: "period",
  monthly: "period",
  time: "period",
  date: "period",
  region: "region",
  regions: "region",
  category: "category",
  categories: "category",
  segment: "segment",
  segments: "segment",
  revenue: "revenue",
  sales: "revenue",
  income: "revenue",
};

function stripLeadingVerb(raw: string): string {
  return raw.trim().replace(/^(put|set|use|show|place)\s+/i, "").trim();
}

function normalizeField(raw: string, context: WidgetContext): string | null {
  const key = stripLeadingVerb(raw).toLowerCase().replace(/\s+/g, "");
  const mapped = FIELD_SYNONYMS[key] ?? key;
  const available = [...context.dimensions, ...context.measures];
  return available.includes(mapped) ? mapped : available.find((f) => f === key) ?? mapped;
}

function findChartType(text: string): ChartType | null {
  const lower = text.toLowerCase();
  for (const type of SUPPORTED_CHART_TYPES) {
    if (lower.includes(`${type} chart`) || lower.includes(`to a ${type}`) || lower.includes(`to ${type}`)) {
      return type;
    }
  }
  if (lower.includes("donut") || lower.includes("doughnut")) return "donut";
  return null;
}

export function interpretWidgetCommand(
  instruction: string,
  context: WidgetContext,
  history: ChatMessage[] = []
): AiInterpretResult {
  const text = instruction.trim();
  const lower = text.toLowerCase();

  if (!text) {
    return { type: "unrecognized", message: "Type an instruction, like \"change this to a line chart\"." };
  }

  // RESET_WIDGET
  if (/\b(reset|start over|default|clear)\b/i.test(lower)) {
    return {
      type: "command",
      command: { action: "reset_widget", widgetId: context.widgetId },
      explanation: `I'll reset "${context.widgetTitle}" back to its default configuration.`,
      requiresConfirmation: true,
    };
  }

  const changes: WidgetChanges = {};
  let touched = false;

  // CHANGE_CHART_TYPE
  const chartType = findChartType(lower);
  if (chartType) {
    changes.chartType = chartType;
    touched = true;
  }

  // CHANGE_TITLE
  const titleMatch = text.match(/title\s+to\s+["“]?([^"”]+?)["”]?$/i) ?? text.match(/rename\s+(?:this|it)\s+to\s+["“]?([^"”]+?)["”]?$/i);
  if (titleMatch) {
    changes.title = titleMatch[1].trim();
    touched = true;
  } else if (/\b(change|update)\s+the\s+title\b/i.test(lower) && !/to\s+/i.test(lower)) {
    return { type: "clarify", message: "What would you like to rename it to?" };
  }

  // CHANGE_X_AXIS / CHANGE_Y_AXIS
  const xMatch = text.match(/([a-z_ ]+?)\s+on\s+(?:the\s+)?x[- ]?axis/i);
  const yMatch = text.match(/([a-z_ ]+?)\s+on\s+(?:the\s+)?y[- ]?axis/i);
  if (xMatch) {
    const field = normalizeField(xMatch[1], context);
    if (field && [...context.dimensions, ...context.measures].includes(field)) {
      changes.xAxis = field;
      touched = true;
    } else {
      return {
        type: "clarify",
        message: `"${stripLeadingVerb(xMatch[1])}" isn't available in this widget's data. Available fields: ${[...context.dimensions, ...context.measures].join(", ")}.`,
      };
    }
  }
  if (yMatch) {
    const field = normalizeField(yMatch[1], context);
    if (field && [...context.dimensions, ...context.measures].includes(field)) {
      changes.yAxis = field;
      touched = true;
    } else {
      return {
        type: "clarify",
        message: `"${stripLeadingVerb(yMatch[1])}" isn't available in this widget's data. Available measures: ${context.measures.join(", ")}.`,
      };
    }
  }

  // SHOW_TOP_N
  const topMatch = lower.match(/top\s+(\d+)/);
  if (topMatch) {
    const n = parseInt(topMatch[1], 10);
    changes.limit = n;
    changes.sort = { field: context.measures[0] ?? "revenue", direction: "descending" };
    touched = true;
  }

  // REMOVE_LEGEND / show legend
  if (/\b(remove|hide)\s+(the\s+)?legend\b/i.test(lower)) {
    changes.showLegend = false;
    touched = true;
  } else if (/\b(show|add)\s+(the\s+)?legend\b/i.test(lower)) {
    changes.showLegend = true;
    touched = true;
  }

  // TOGGLE_GRID
  if (/\b(hide|remove|toggle off)\s+(the\s+)?grid\b/i.test(lower)) {
    changes.showGrid = false;
    touched = true;
  } else if (/\b(show|add|toggle on)\s+(the\s+)?grid\b/i.test(lower)) {
    changes.showGrid = true;
    touched = true;
  }

  // CHANGE_AGGREGATION
  const aggMatch = lower.match(/\b(sum|average|avg|count|min(?:imum)?|max(?:imum)?|total)\b/);
  if (aggMatch && /\b(aggregat|group|summar)/i.test(lower)) {
    const raw = aggMatch[1];
    const agg = raw === "average" ? "avg" : raw === "total" ? "sum" : raw === "minimum" ? "min" : raw === "maximum" ? "max" : raw;
    changes.aggregation = agg as WidgetChanges["aggregation"];
    touched = true;
  }

  if (touched) {
    const requiresConfirmation = !!(changes.chartType || (changes.xAxis && changes.yAxis) || changes.groupBy);
    return {
      type: "command",
      command: { action: "update_chart", widgetId: context.widgetId, changes },
      explanation: describeChanges(context, changes),
      requiresConfirmation,
    };
  }

  // Vague/ambiguous instruction with no recognizable rule matched — ask,
  // using the widget's REAL available measures rather than inventing any.
  if (/^(show|display)\b/i.test(lower) || lower.length < 6) {
    return {
      type: "clarify",
      message: "What would you like to see?",
      options: context.measures,
    };
  }

  void history; // reserved for a real LLM provider's conversational context
  return {
    type: "unrecognized",
    message:
      'I didn\'t catch that. Try things like "change this to a line chart", "change the title to Monthly Revenue", "put region on the x axis and revenue on the y axis", or "show the top 10".',
  };
}

function describeChanges(context: WidgetContext, changes: WidgetChanges): string {
  const parts: string[] = [];
  if (changes.chartType) parts.push(`change it to a ${changes.chartType} chart`);
  if (changes.title) parts.push(`retitle it "${changes.title}"`);
  if (changes.xAxis) parts.push(`use ${changes.xAxis} on the X axis`);
  if (changes.yAxis) parts.push(`use ${changes.yAxis} on the Y axis`);
  if (changes.limit) parts.push(`show only the top ${changes.limit}`);
  if (changes.showLegend === false) parts.push("hide the legend");
  if (changes.showLegend === true) parts.push("show the legend");
  if (changes.showGrid === false) parts.push("hide the grid");
  if (changes.showGrid === true) parts.push("show the grid");
  if (changes.aggregation) parts.push(`aggregate by ${changes.aggregation}`);
  return `I'll ${parts.join(", ")} on "${context.widgetTitle}".`;
}
