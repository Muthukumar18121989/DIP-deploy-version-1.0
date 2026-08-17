import type { ReactNode } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Database,
  FlaskConical,
  Heart,
  ListChecks,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, riskVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { STRATEGY_LIFECYCLE_LABELS } from "@/lib/statusLabels";
import { api } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";

const LEVER_MILESTONES: Record<string, string[]> = {
  marketing: ["Reallocate budget across the affected regions", "Brief channel owners on the new spend targets", "Track weekly spend-to-revenue pacing"],
  pricing: ["Update price lists in the affected regions/categories", "Notify sales and customer-facing teams", "Monitor demand elasticity for 2-3 weeks"],
  operations: ["Coordinate with supply chain on restocking", "Prioritize affected regions/SKUs first", "Track stockout rate weekly until resolved"],
};

export default function StrategyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ["strategy-report", id],
    queryFn: () => api.getStrategyReport(id!),
    enabled: !!id,
  });

  const { data: useCase } = useQuery({
    queryKey: ["use-case", report?.strategy.use_case_id],
    queryFn: () => api.getUseCase(report!.strategy.use_case_id),
    enabled: !!report,
  });

  if (!id) return null;

  if (isLoading || !report || !useCase) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-foreground-muted">
        {isError ? "Strategy not found." : "Loading decision report..."}
      </div>
    );
  }

  const { strategy, profiling, training, dashboard } = report;
  const positive = strategy.predicted_revenue_delta >= 0;
  const lifecycle = STRATEGY_LIFECYCLE_LABELS[strategy.lifecycle_status];
  const topFeatures = training?.feature_importances?.slice(0, 6) ?? [];
  const milestones = LEVER_MILESTONES[strategy.lever] ?? ["Assign an owner", "Set a review checkpoint", "Track the target KPI weekly"];

  return (
    <AppShell useCaseId={strategy.use_case_id} useCaseName={useCase.name} title="Decision Report">
      <div className="mx-auto max-w-4xl">
        <button
          onClick={() => navigate(`/use-cases/${strategy.use_case_id}/decisions`)}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to Decision Library
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={lifecycle.variant}>{lifecycle.label}</Badge>
            <Badge variant={riskVariant(strategy.risk)}>{strategy.risk} risk</Badge>
            {strategy.version_number > 1 && <Badge variant="accent">Version {strategy.version_number}</Badge>}
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-foreground">{strategy.title}</h1>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/use-cases/${strategy.use_case_id}/sandbox?strategyId=${strategy.id}`)}
            >
              <SlidersHorizontal className="size-3.5" /> Run in Sandbox
            </Button>
          </div>
          <div className={`mt-2 flex items-center gap-1.5 text-xl font-semibold ${positive ? "text-success" : "text-danger"}`}>
            {positive ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
            {formatPercent(strategy.predicted_revenue_delta_pct, { signed: true })} projected revenue impact
          </div>
        </motion.div>

        <div className="mt-8 flex flex-col gap-5">
          <Section icon={Sparkles} title="Executive Summary">
            <p>
              {strategy.title} is projected to change revenue by {formatPercent(strategy.predicted_revenue_delta_pct, { signed: true })}{" "}
              ({formatCurrency(strategy.predicted_revenue_delta)}), with {strategy.confidence_pct}% model confidence. This is a{" "}
              {strategy.risk.toLowerCase()}-risk, {strategy.implementation_difficulty.toLowerCase()}-difficulty option with an estimated{" "}
              {strategy.timeline} timeline and {formatCurrency(strategy.estimated_cost)} implementation cost.
            </p>
          </Section>

          <Section icon={Target} title="Business Problem & Opportunity">
            <p className="mb-2"><span className="font-medium text-foreground">Problem: </span>{useCase.problem}</p>
            <p><span className="font-medium text-foreground">Opportunity: </span>{useCase.objective}</p>
          </Section>

          <Section icon={FlaskConical} title="Why AI Selected This Strategy">
            <p className="mb-3">{strategy.methodology}</p>
            {topFeatures.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">Top revenue drivers the model found</p>
                {topFeatures.map((f) => (
                  <div key={f.feature} className="flex items-center gap-2 text-xs">
                    <span className="w-40 shrink-0 truncate text-foreground-muted">{f.feature.replace(/_/g, " ")}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${f.importance * 100}%` }} />
                    </div>
                    <span className="w-10 text-right text-foreground-subtle">{(f.importance * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section icon={Database} title="Data & Models Used">
            {profiling && (
              <p className="mb-3">
                Trained on {profiling.row_count.toLocaleString()} records across {profiling.column_count} fields
                (data quality score: {profiling.data_quality_score}/100).
              </p>
            )}
            {training && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-foreground-subtle">
                      <th className="pb-1.5 font-medium">Model</th>
                      <th className="pb-1.5 font-medium">Test R²</th>
                      <th className="pb-1.5 font-medium">Test MAE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {training.comparison.map((row) => (
                      <tr key={row.model} className="border-t border-border">
                        <td className="py-1.5 text-foreground-muted">
                          {row.model}
                          {row.model === training.best_model_name && <Badge variant="primary" className="ml-2">Selected</Badge>}
                        </td>
                        <td className="py-1.5 font-medium text-foreground">{(row.test_r2 * 100).toFixed(1)}%</td>
                        <td className="py-1.5 font-medium text-foreground">{formatCurrency(row.test_mae, { compact: true })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section icon={ListChecks} title="Business Assumptions">
            <p>{strategy.methodology}</p>
            <p className="mt-2 text-foreground-muted">
              The scenario is applied to the most recent period in the connected dataset; predictions assume the underlying business
              relationships (price elasticity, seasonality, marketing response) stay consistent with historical patterns.
            </p>
          </Section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Section icon={Banknote} title="Financial Impact" compact>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <Metric label="Revenue Impact" value={formatCurrency(strategy.predicted_revenue_delta)} />
                <Metric label="Implementation Cost" value={formatCurrency(strategy.estimated_cost)} />
                <Metric label="Estimated ROI" value={strategy.estimated_roi !== null ? `${strategy.estimated_roi}x` : "—"} />
                <Metric label="Confidence" value={`${strategy.confidence_pct}%`} />
              </dl>
            </Section>

            <Section icon={Heart} title="Customer Impact (current)" compact>
              {dashboard ? (
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <Metric label="Churn Rate" value={`${dashboard.kpis.churn_rate_pct}%`} />
                  <Metric label="Avg Satisfaction" value={`${dashboard.kpis.avg_satisfaction}/5`} />
                  <Metric label="Stockout Rate" value={`${dashboard.kpis.stockout_rate_pct}%`} />
                  <Metric label="Avg Order Value" value={formatCurrency(dashboard.kpis.avg_order_value)} />
                </dl>
              ) : (
                <p className="text-foreground-muted">No dashboard data available for this version.</p>
              )}
            </Section>
          </div>

          <Section icon={ListChecks} title="Implementation Roadmap">
            <ul className="flex flex-col gap-2">
              {milestones.map((m, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  {m}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-foreground-subtle">Estimated timeline: {strategy.timeline} · Difficulty: {strategy.implementation_difficulty}</p>
          </Section>

          <Section icon={AlertTriangle} title="Risk Assessment">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant={riskVariant(strategy.risk)}>{strategy.risk} risk</Badge>
            </div>
            <div className="flex flex-col gap-1.5">
              {strategy.cons.map((con, i) => (
                <p key={i} className="text-foreground-muted">• {con}</p>
              ))}
              {strategy.cons.length === 0 && <p className="text-foreground-muted">No material downside identified at this scenario size.</p>}
            </div>
          </Section>

          <Section icon={Target} title="Success Metrics">
            <p>
              Track <span className="font-medium text-foreground">{useCase.kpi}</span> against the{" "}
              {formatPercent(strategy.predicted_revenue_delta_pct, { signed: true })} target. Once published, record actual results in{" "}
              <Link to={`/use-cases/${strategy.use_case_id}/monitoring`} className="text-primary hover:underline">
                Monitoring
              </Link>{" "}
              to track prediction accuracy over time.
            </p>
          </Section>
        </div>
      </div>
    </AppShell>
  );
}

function Section({
  icon: Icon,
  title,
  children,
  compact,
}: {
  icon: typeof Sparkles;
  title: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <Card className={compact ? "h-full" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-foreground-muted">{children}</CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-foreground-subtle">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}

