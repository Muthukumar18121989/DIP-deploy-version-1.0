import { useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  Download,
  Eye,
  GitCompareArrows,
  Send,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, riskVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useUseCase } from "@/lib/hooks";
import { exportStrategyToPdf } from "@/lib/export";
import { STRATEGY_LIFECYCLE_LABELS } from "@/lib/statusLabels";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { Strategy } from "@/lib/types";

export default function DecisionEngine() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: useCase } = useUseCase(id);
  const [selected, setSelected] = useState<string[]>([]);
  const [searchParams] = useSearchParams();
  const publishedOnly = searchParams.get("status") === "published";

  const { data: allStrategies, isLoading, isError } = useQuery({
    queryKey: ["strategies", id],
    queryFn: () => api.listStrategies(id!),
    enabled: !!id,
    retry: false,
  });

  const strategies = publishedOnly
    ? allStrategies?.filter((s) => s.lifecycle_status === "published" || s.lifecycle_status === "monitoring")
    : allStrategies;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["strategies", id] });

  const duplicateMutation = useMutation({
    mutationFn: (strategyId: string) => api.duplicateStrategy(strategyId),
    onSuccess: () => {
      toast.success("Strategy duplicated");
      invalidate();
    },
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ strategyId, status }: { strategyId: string; status: Strategy["lifecycle_status"] }) =>
      api.updateStrategy(strategyId, status),
    onSuccess: (_, { status }) => {
      toast.success(`Marked as ${STRATEGY_LIFECYCLE_LABELS[status].label}`);
      invalidate();
    },
  });

  function toggleSelect(strategyId: string) {
    setSelected((prev) => {
      if (prev.includes(strategyId)) return prev.filter((s) => s !== strategyId);
      if (prev.length >= 4) return prev;
      return [...prev, strategyId];
    });
  }

  if (!id) return null;

  return (
    <AppShell useCaseId={id} useCaseName={useCase?.name} title={publishedOnly ? "Published Strategies" : "Decision Library"}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{publishedOnly ? "Published Strategies" : "Decision Library"}</h2>
            <p className="text-sm text-foreground-muted">
              {publishedOnly
                ? "Strategies currently shipped to the business — select 2–4 to compare."
                : "Every decision the AI has ever generated, persisted as a reusable strategy. Select 2–4 to compare."}
            </p>
          </div>
          {selected.length >= 2 && (
            <Button asChild>
              <Link to={`/strategies/compare?ids=${selected.join(",")}`}>
                <GitCompareArrows className="size-4" /> Compare {selected.length}
              </Link>
            </Button>
          )}
        </div>

        {isLoading && <p className="text-sm text-foreground-muted">Loading decision library...</p>}
        {isError && (
          <Card className="p-6">
            <p className="text-sm text-foreground-muted">No decisions yet — run the AI pipeline first.</p>
            <Button className="mt-4" onClick={() => navigate(`/use-cases/${id}/pipeline`)}>
              Go to AI Pipeline <ArrowRight className="size-4" />
            </Button>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {strategies?.map((strategy, i) => {
            const positive = strategy.predicted_revenue_delta >= 0;
            const lifecycle = STRATEGY_LIFECYCLE_LABELS[strategy.lifecycle_status];
            const isPublished = strategy.lifecycle_status === "published" || strategy.lifecycle_status === "monitoring";
            const isArchived = strategy.lifecycle_status === "archived";

            return (
              <motion.div
                key={strategy.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.4) }}
              >
                <Card className={`h-full ${isArchived ? "opacity-60" : ""}`}>
                  <CardHeader>
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selected.includes(strategy.id)}
                        onChange={() => toggleSelect(strategy.id)}
                        className="mt-1 size-4 accent-[var(--color-primary)]"
                        aria-label={`Select ${strategy.title} for comparison`}
                      />
                      <div>
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge variant="primary">#{i + 1}</Badge>
                          <Badge variant={riskVariant(strategy.risk)}>{strategy.risk} risk</Badge>
                          <Badge variant={lifecycle.variant}>{lifecycle.label}</Badge>
                          {strategy.version_number > 1 && <Badge variant="accent">v{strategy.version_number}</Badge>}
                        </div>
                        <CardTitle className="text-base">{strategy.title}</CardTitle>
                      </div>
                    </div>
                    <div className={`flex shrink-0 items-center gap-1 text-lg font-semibold ${positive ? "text-success" : "text-danger"}`}>
                      {positive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                      {formatPercent(strategy.predicted_revenue_delta_pct, { signed: true })}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">{strategy.methodology}</CardDescription>

                    <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-lg border border-border bg-surface p-2.5">
                        <p className="text-xs text-foreground-subtle">Confidence</p>
                        <p className="text-sm font-semibold text-foreground">{strategy.confidence_pct}%</p>
                      </div>
                      <div className="rounded-lg border border-border bg-surface p-2.5">
                        <p className="text-xs text-foreground-subtle">Est. cost</p>
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(strategy.estimated_cost, { compact: true })}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-surface p-2.5">
                        <p className="text-xs text-foreground-subtle">Est. ROI</p>
                        <p className="text-sm font-semibold text-foreground">
                          {strategy.estimated_roi !== null ? `${strategy.estimated_roi}x` : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-foreground-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" /> {strategy.timeline}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="size-3.5" /> {strategy.implementation_difficulty} difficulty
                      </span>
                    </div>

                    <div className="mb-4 flex flex-col gap-2">
                      {strategy.pros.map((pro, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-foreground-muted">
                          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                          {pro}
                        </div>
                      ))}
                      {strategy.cons.map((con, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-foreground-muted">
                          <XCircle className="mt-0.5 size-3.5 shrink-0 text-danger" />
                          {con}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-1 border-t border-border pt-3">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/strategies/${strategy.id}`)} title="View Details">
                        <Eye className="size-3.5" /> Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/use-cases/${id}/sandbox?strategyId=${strategy.id}`)}
                        title="Open in Sandbox"
                      >
                        <SlidersHorizontal className="size-3.5" /> Sandbox
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Duplicate"
                        onClick={() => duplicateMutation.mutate(strategy.id)}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={isPublished ? "Unpublish" : "Publish"}
                        onClick={() =>
                          lifecycleMutation.mutate({ strategyId: strategy.id, status: isPublished ? "approved" : "published" })
                        }
                      >
                        <Send className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={isArchived ? "Restore" : "Archive"}
                        onClick={() =>
                          lifecycleMutation.mutate({ strategyId: strategy.id, status: isArchived ? "generated" : "archived" })
                        }
                      >
                        <Archive className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Export PDF"
                        onClick={() => exportStrategyToPdf(strategy, useCase?.name ?? "strategy")}
                      >
                        <Download className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
