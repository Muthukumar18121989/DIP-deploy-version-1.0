import type { BadgeProps } from "@/components/ui/Badge";
import type { UseCaseStatus } from "./types";

export const USE_CASE_STATUS_LABELS: Record<UseCaseStatus, { label: string; variant: BadgeProps["variant"] }> = {
  created: { label: "Draft", variant: "default" },
  needs_mapping: { label: "Map Columns", variant: "warning" },
  data_ready: { label: "Data Connected", variant: "accent" },
  pipeline_running: { label: "Pipeline Running", variant: "warning" },
  pipeline_complete: { label: "Decision Generated", variant: "success" },
  pipeline_error: { label: "Error", variant: "danger" },
};

export const STRATEGY_LIFECYCLE_LABELS: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  generated: { label: "Generated", variant: "default" },
  reviewed: { label: "Reviewed", variant: "accent" },
  sandbox_tested: { label: "Sandbox Tested", variant: "accent" },
  locked_in: { label: "Locked In", variant: "primary" },
  approved: { label: "Approved", variant: "primary" },
  published: { label: "Published", variant: "success" },
  monitoring: { label: "Monitoring", variant: "warning" },
  archived: { label: "Archived", variant: "default" },
};

export const STRATEGY_LIFECYCLE_ORDER = [
  "generated",
  "reviewed",
  "sandbox_tested",
  "locked_in",
  "approved",
  "published",
  "monitoring",
  "archived",
] as const;
