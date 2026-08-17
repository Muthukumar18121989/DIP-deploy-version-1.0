import { motion } from "framer-motion";
import { Check, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineEvent } from "@/lib/types";

type Status = "pending" | "running" | "complete" | "error";

export function StageNode({
  label,
  status,
  active,
  icon: Icon,
  onClick,
}: {
  label: string;
  status: Status;
  active: boolean;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all",
        active ? "border-primary/50 bg-primary/10" : "border-border bg-surface hover:bg-surface-hover",
        status === "pending" && "opacity-50"
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
          status === "complete" && "border-success bg-success/15 text-success",
          status === "running" && "border-primary bg-primary/15 text-primary",
          status === "pending" && "border-border-strong text-foreground-subtle",
          status === "error" && "border-danger bg-danger/15 text-danger"
        )}
      >
        {status === "complete" && <Check className="size-3.5" />}
        {status === "running" && <Loader2 className="size-3.5 animate-spin" />}
        {(status === "pending" || status === "error") && <span className="size-1.5 rounded-full bg-current" />}
      </span>
      <Icon className={cn("size-3.5 shrink-0", active ? "text-primary" : "text-foreground-subtle")} />
      <span className={cn("font-medium", active ? "text-foreground" : "text-foreground-muted")}>{label}</span>
      {status === "running" && (
        <motion.span
          layoutId="pulse"
          className="ml-auto size-1.5 rounded-full bg-primary"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        />
      )}
    </button>
  );
}

interface TrainingEventData {
  confidence_pct?: number;
  best_model_name?: string;
}

interface EvaluationEventData {
  top_features?: { feature: string; importance: number }[];
}

interface ScenarioEventData {
  forecast?: { forecast: { period: string; revenue: number }[] };
}

function StageVisual({ stage, data }: { stage: string; data: Record<string, unknown> }) {
  if (stage === "training") {
    const { confidence_pct, best_model_name } = data as TrainingEventData;
    if (confidence_pct === undefined) return null;
    return (
      <div className="rounded-lg border border-border bg-background/60 p-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-foreground-subtle">Model confidence ({best_model_name})</span>
          <span className="font-semibold text-foreground">{confidence_pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${confidence_pct}%` }} />
        </div>
      </div>
    );
  }

  if (stage === "evaluation") {
    const { top_features } = data as EvaluationEventData;
    if (!top_features?.length) return null;
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-background/60 p-3">
        {top_features.slice(0, 5).map((f) => (
          <div key={f.feature} className="flex items-center gap-2 text-xs">
            <span className="w-32 shrink-0 truncate text-foreground-subtle">{f.feature.replace(/_/g, " ")}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${f.importance * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (stage === "scenario_testing") {
    const forecast = (data as ScenarioEventData).forecast?.forecast;
    if (!forecast?.length) return null;
    return (
      <div className="flex gap-3 rounded-lg border border-border bg-background/60 p-3">
        {forecast.map((f) => (
          <div key={f.period} className="text-center text-xs">
            <p className="text-foreground-subtle">{f.period}</p>
            <p className="mt-1 font-semibold text-foreground">${(f.revenue / 1000).toFixed(0)}K</p>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export function StageDetailPanel({ event, expert }: { event: PipelineEvent | undefined; expert: boolean }) {
  if (!event) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-foreground-subtle">
        Select a stage, or run the pipeline to watch it think.
      </div>
    );
  }

  const data = (event.data ?? {}) as Record<string, unknown>;

  return (
    <motion.div
      key={event.stage + event.status}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-4"
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">What happened</p>
        <p className="mt-1 text-base text-foreground">{event.what_happened}</p>
      </div>
      {event.why && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-accent">Why it matters</p>
          <p className="mt-1 text-sm text-foreground-muted">{event.why}</p>
        </div>
      )}
      {event.ai_doing && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">What the AI is doing</p>
          <p className="mt-1 text-sm text-foreground-muted">{event.ai_doing}</p>
        </div>
      )}

      <StageVisual stage={event.stage} data={data} />

      {expert && Object.keys(data).length > 0 && (
        <div className="mt-2 rounded-lg border border-border bg-background/60 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-subtle">Expert data</p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs text-foreground-muted">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </motion.div>
  );
}
