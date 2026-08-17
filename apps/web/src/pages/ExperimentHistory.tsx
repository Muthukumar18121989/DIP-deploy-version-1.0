import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock, GitCompare, User } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { useUseCase } from "@/lib/hooks";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { ExperimentDetail } from "@/lib/types";

const STATUS_VARIANT = {
  complete: "success",
  running: "warning",
  error: "danger",
} as const;

export default function ExperimentHistory() {
  const { id } = useParams<{ id: string }>();
  const { data: useCase } = useUseCase(id);
  const [selected, setSelected] = useState<string[]>([]);

  const { data: experiments } = useQuery({
    queryKey: ["experiments", id],
    queryFn: () => api.listExperiments(id!),
    enabled: !!id,
  });

  const compareQuery = useQuery({
    queryKey: ["experiment-compare", selected],
    queryFn: async () => {
      const [a, b] = selected;
      const [detailA, detailB] = await Promise.all([api.getExperimentDetail(a), api.getExperimentDetail(b)]);
      return { detailA, detailB };
    },
    enabled: selected.length === 2,
  });

  function toggleSelect(experimentId: string) {
    setSelected((prev) => {
      if (prev.includes(experimentId)) return prev.filter((id) => id !== experimentId);
      if (prev.length >= 2) return [prev[1], experimentId];
      return [...prev, experimentId];
    });
  }

  if (!id) return null;

  return (
    <AppShell useCaseId={id} useCaseName={useCase?.name} title="Experiment History">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Version history</h2>
          <p className="text-sm text-foreground-muted">
            Every AI re-run creates a new version instead of overwriting the last one. Select two to compare.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {experiments?.map((experiment, i) => (
            <motion.div key={experiment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card
                className={`flex items-center justify-between gap-4 p-4 ${selected.includes(experiment.id) ? "border-primary/50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(experiment.id)}
                    onChange={() => toggleSelect(experiment.id)}
                    className="size-4 accent-[var(--color-primary)]"
                    aria-label={`Select version ${experiment.version_number} for comparison`}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">Version {experiment.version_number}</p>
                    <p className="flex items-center gap-3 text-xs text-foreground-subtle">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {new Date(experiment.created_at).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="size-3" /> {experiment.created_by}
                      </span>
                      {experiment.execution_time_seconds && <span>{experiment.execution_time_seconds}s</span>}
                    </p>
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[experiment.status]}>{experiment.status}</Badge>
              </Card>
            </motion.div>
          ))}
          {experiments?.length === 0 && (
            <Card className="p-8 text-center text-sm text-foreground-muted">No pipeline runs yet for this use case.</Card>
          )}
        </div>

        {selected.length === 2 && (
          <div className="mt-8">
            <div className="mb-3 flex items-center gap-2">
              <GitCompare className="size-4 text-foreground-muted" />
              <h3 className="text-sm font-semibold text-foreground">Comparing 2 versions</h3>
            </div>
            {compareQuery.isLoading && <p className="text-sm text-foreground-muted">Loading comparison...</p>}
            {compareQuery.data && (
              <ComparisonTable
                detailA={compareQuery.data.detailA}
                detailB={compareQuery.data.detailB}
                labelA={`Version ${experiments?.find((e) => e.id === selected[0])?.version_number}`}
                labelB={`Version ${experiments?.find((e) => e.id === selected[1])?.version_number}`}
              />
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ComparisonTable({
  detailA,
  detailB,
  labelA,
  labelB,
}: {
  detailA: ExperimentDetail;
  detailB: ExperimentDetail;
  labelA: string;
  labelB: string;
}) {
  const rows = [
    {
      label: "Best model",
      a: detailA.training?.best_model_name ?? "—",
      b: detailB.training?.best_model_name ?? "—",
    },
    {
      label: "Model accuracy (test R²)",
      a: detailA.training ? `${(detailA.training.comparison[0]?.test_r2 * 100).toFixed(1)}%` : "—",
      b: detailB.training ? `${(detailB.training.comparison[0]?.test_r2 * 100).toFixed(1)}%` : "—",
    },
    {
      label: "Data quality score",
      a: detailA.profiling ? `${detailA.profiling.data_quality_score}/100` : "—",
      b: detailB.profiling ? `${detailB.profiling.data_quality_score}/100` : "—",
    },
    {
      label: "Top decision",
      a: detailA.decisions?.[0]?.title ?? "—",
      b: detailB.decisions?.[0]?.title ?? "—",
    },
    {
      label: "Top decision revenue impact",
      a: detailA.decisions?.[0] ? formatPercent(detailA.decisions[0].predicted_revenue_delta_pct, { signed: true }) : "—",
      b: detailB.decisions?.[0] ? formatPercent(detailB.decisions[0].predicted_revenue_delta_pct, { signed: true }) : "—",
    },
    {
      label: "Total revenue (dashboard)",
      a: detailA.dashboard ? formatCurrency(detailA.dashboard.kpis.total_revenue, { compact: true }) : "—",
      b: detailB.dashboard ? formatCurrency(detailB.dashboard.kpis.total_revenue, { compact: true }) : "—",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Version comparison</CardTitle>
          <CardDescription>{labelA} vs. {labelB}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-foreground-subtle">
                <th className="pb-2 font-medium">Metric</th>
                <th className="pb-2 font-medium">{labelA}</th>
                <th className="pb-2 font-medium">{labelB}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-border">
                  <td className="py-2.5 text-foreground-muted">{row.label}</td>
                  <td className="py-2.5 font-medium text-foreground">{row.a}</td>
                  <td className="py-2.5 font-medium text-foreground">{row.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
