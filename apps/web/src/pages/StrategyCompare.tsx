import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Award, Clock3, Scale, Shield, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, riskVariant } from "@/components/ui/Badge";
import { STRATEGY_LIFECYCLE_LABELS } from "@/lib/statusLabels";
import { api } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { Strategy } from "@/lib/types";

const RISK_SEVERITY: Record<Strategy["risk"], number> = { Low: 0, Medium: 1, High: 2 };

function timelineWeeks(timeline: string): number {
  const matches = timeline.match(/\d+/g);
  if (!matches) return 99;
  return Math.max(...matches.map(Number));
}

function recommendationScore(s: Strategy): number {
  const riskPenalty = s.risk === "High" ? 3 : s.risk === "Medium" ? 1.5 : 0;
  return s.predicted_revenue_delta_pct * (s.confidence_pct / 100) - riskPenalty;
}

export default function StrategyCompare() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ids = (searchParams.get("ids") ?? "").split(",").filter(Boolean);

  const { data: strategies, isLoading, isError } = useQuery({
    queryKey: ["strategy-compare", ids],
    queryFn: () => api.compareStrategies(ids),
    enabled: ids.length >= 2,
  });

  const { data: useCase } = useQuery({
    queryKey: ["use-case", strategies?.[0]?.use_case_id],
    queryFn: () => api.getUseCase(strategies![0].use_case_id),
    enabled: !!strategies?.length,
  });

  if (ids.length < 2) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-foreground-muted">
        Select 2-4 strategies from the Decision Library to compare.
      </div>
    );
  }

  if (isLoading || !strategies || !useCase) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-foreground-muted">
        {isError ? "Couldn't load these strategies." : "Loading comparison..."}
      </div>
    );
  }

  const bestPerformer = [...strategies].sort((a, b) => b.predicted_revenue_delta - a.predicted_revenue_delta)[0];
  const highestRoi = [...strategies].filter((s) => s.estimated_roi !== null).sort((a, b) => (b.estimated_roi ?? 0) - (a.estimated_roi ?? 0))[0];
  const lowestRisk = [...strategies].sort((a, b) => RISK_SEVERITY[a.risk] - RISK_SEVERITY[b.risk] || b.confidence_pct - a.confidence_pct)[0];
  const fastest = [...strategies].sort((a, b) => timelineWeeks(a.timeline) - timelineWeeks(b.timeline))[0];
  const mostBalanced = [...strategies].sort((a, b) => recommendationScore(b) - recommendationScore(a))[0];

  const highlightRows = [
    { icon: TrendingUp, label: "Best Performer", strategy: bestPerformer, reason: `${formatCurrency(bestPerformer.predicted_revenue_delta)} projected impact` },
    { icon: Award, label: "Highest ROI", strategy: highestRoi, reason: highestRoi ? `${highestRoi.estimated_roi}x estimated ROI` : "n/a" },
    { icon: Shield, label: "Lowest Risk", strategy: lowestRisk, reason: `${lowestRisk.risk} risk, ${lowestRisk.confidence_pct}% confidence` },
    { icon: Clock3, label: "Fastest Implementation", strategy: fastest, reason: fastest.timeline },
    { icon: Scale, label: "Most Balanced Strategy", strategy: mostBalanced, reason: "Best blend of impact, confidence, and risk" },
  ].filter((row) => row.strategy);

  const metricRows: { label: string; render: (s: Strategy) => string }[] = [
    { label: "Revenue Impact", render: (s) => `${formatPercent(s.predicted_revenue_delta_pct, { signed: true })} (${formatCurrency(s.predicted_revenue_delta)})` },
    { label: "Cost", render: (s) => formatCurrency(s.estimated_cost) },
    { label: "Estimated ROI", render: (s) => (s.estimated_roi !== null ? `${s.estimated_roi}x` : "—") },
    { label: "Risk", render: (s) => s.risk },
    { label: "Timeline", render: (s) => s.timeline },
    { label: "Implementation Complexity", render: (s) => s.implementation_difficulty },
    { label: "Confidence / Success Probability", render: (s) => `${s.confidence_pct}%` },
    { label: "Recommendation Score", render: (s) => recommendationScore(s).toFixed(1) },
    { label: "Lifecycle", render: (s) => STRATEGY_LIFECYCLE_LABELS[s.lifecycle_status].label },
  ];

  return (
    <AppShell useCaseId={useCase.id} useCaseName={useCase.name} title="Strategy Comparison">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => navigate(`/use-cases/${useCase.id}/decisions`)}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to Decision Library
        </button>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {highlightRows.map((row, i) => (
            <motion.div key={row.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="h-full p-3">
                <row.icon className="mb-1.5 size-4 text-primary" />
                <p className="text-xs text-foreground-subtle">{row.label}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{row.strategy!.title}</p>
                <p className="mt-0.5 text-xs text-foreground-muted">{row.reason}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Side-by-side comparison</CardTitle>
              <CardDescription>{strategies.length} strategies</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-foreground-subtle">
                    <th className="pb-2 pr-4 font-medium">Metric</th>
                    {strategies.map((s) => (
                      <th key={s.id} className="pb-2 pr-4 font-medium">
                        <div className="flex items-center gap-1.5">
                          {s.title}
                          <Badge variant={riskVariant(s.risk)} className="shrink-0">
                            {s.risk}
                          </Badge>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metricRows.map((row) => (
                    <tr key={row.label} className="border-t border-border">
                      <td className="py-2.5 pr-4 text-foreground-muted">{row.label}</td>
                      {strategies.map((s) => (
                        <td key={s.id} className="py-2.5 pr-4 font-medium text-foreground">
                          {row.render(s)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
