import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { LayoutDashboard, Lock, RotateCcw, SlidersHorizontal, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Slider } from "@/components/ui/Slider";
import { Button } from "@/components/ui/Button";
import { Badge, riskVariant } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { useUseCase } from "@/lib/hooks";
import { formatCurrency, formatPercent, formatTooltipCurrency } from "@/lib/utils";
import type { SimulateDeltas } from "@/lib/types";

const LEVERS: { key: keyof SimulateDeltas; label: string; min: number; max: number }[] = [
  { key: "price_delta_pct", label: "Price", min: -30, max: 30 },
  { key: "marketing_delta_pct", label: "Marketing Budget", min: -50, max: 100 },
  { key: "discount_delta_pct", label: "Discount", min: -10, max: 20 },
  { key: "inventory_delta_pct", label: "Inventory", min: -50, max: 200 },
  { key: "inflation_delta_pct", label: "Inflation", min: -20, max: 20 },
  { key: "demand_delta_pct", label: "Demand", min: -30, max: 50 },
  { key: "churn_delta_pct", label: "Customer Retention / Churn", min: -50, max: 100 },
];

const DEFAULT_DELTAS: SimulateDeltas = {
  price_delta_pct: 0,
  marketing_delta_pct: 0,
  discount_delta_pct: 0,
  inventory_delta_pct: 0,
  inflation_delta_pct: 0,
  demand_delta_pct: 0,
  churn_delta_pct: 0,
};

export default function ScenarioSandbox() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const strategyId = searchParams.get("strategyId");
  const { data: useCase } = useUseCase(id);
  const [deltas, setDeltas] = useState<SimulateDeltas>(DEFAULT_DELTAS);
  const [hydrated, setHydrated] = useState(!strategyId);

  const { data: strategy } = useQuery({
    queryKey: ["strategy", strategyId],
    queryFn: () => api.getStrategy(strategyId!),
    enabled: !!strategyId,
  });

  // Reached via the sidebar/mobile-nav "Sandbox" link (no strategyId in the
  // URL) rather than a Decision Library card's scoped "Sandbox" button —
  // offer a picker instead of silently running an unscoped, un-lockable
  // simulation with no way to save results.
  const { data: pickableStrategies } = useQuery({
    queryKey: ["strategies", id],
    queryFn: () => api.listStrategies(id!),
    enabled: !!id && !strategyId,
  });

  useEffect(() => {
    if (strategy && !hydrated) {
      if (strategy.sandbox_deltas) setDeltas(strategy.sandbox_deltas);
      setHydrated(true);
    }
  }, [strategy, hydrated]);

  const simulateMutation = useMutation({
    mutationFn: (d: SimulateDeltas) => api.simulate(id!, d),
  });

  const lockInMutation = useMutation({
    mutationFn: () => api.lockInStrategy(strategyId!, deltas),
    onSuccess: (newStrategy) => {
      toast.success(`Locked in as version ${newStrategy.version_number}`, {
        description: "The model was retrained on this scenario and a new strategy version was saved.",
      });
      navigate(`/strategies/${newStrategy.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (!id || !hydrated) return;
    const handle = setTimeout(() => simulateMutation.mutate(deltas), 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, deltas, hydrated]);

  if (!id) return null;

  const result = simulateMutation.data;
  const positive = result ? result.predicted_revenue_delta >= 0 : true;

  const chartData = result
    ? Object.entries(result.revenue_by_region).map(([region, revenue]) => ({
        region,
        baseline: result.baseline_revenue_by_region[region] ?? 0,
        scenario: revenue,
      }))
    : [];

  return (
    <AppShell useCaseId={id} useCaseName={useCase?.name} title="Scenario Sandbox">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Decision sandbox</h2>
            <p className="text-sm text-foreground-muted">
              Move any lever — every change re-runs the trained model live.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeltas(DEFAULT_DELTAS)}>
              <RotateCcw className="size-3.5" /> Reset
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/use-cases/${id}/dashboard`)}>
              <LayoutDashboard className="size-3.5" /> View on Dashboard
            </Button>
            {strategyId && (
              <Button size="sm" onClick={() => lockInMutation.mutate()} disabled={lockInMutation.isPending}>
                <Lock className="size-3.5" /> {lockInMutation.isPending ? "Retraining model..." : "Lock In Strategy"}
              </Button>
            )}
          </div>
        </div>

        {strategy && (
          <Card className="mb-6 border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 text-primary" />
              <span className="text-foreground-muted">Sandbox loaded from:</span>
              <span className="font-medium text-foreground">{strategy.title}</span>
              {strategy.version_number > 1 && <Badge variant="accent">v{strategy.version_number}</Badge>}
            </div>
            <p className="mt-1 text-xs text-foreground-subtle">
              Adjust levers below, then Lock In Strategy to freeze this scenario, retrain the model against it, and save a new version.
            </p>
          </Card>
        )}

        {!strategyId && pickableStrategies && pickableStrategies.length > 0 && (
          <Card className="mb-6 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm">
              <SlidersHorizontal className="size-4 text-primary" />
              <span className="font-medium text-foreground">Choose a strategy to simulate</span>
            </div>
            <p className="mb-3 text-xs text-foreground-subtle">
              You're in the sandbox without a strategy loaded, so levers are unset and results can't be locked in yet.
              Pick one from the Decision Library to preload its deltas and enable Lock In.
            </p>
            <div className="flex flex-col gap-2">
              {pickableStrategies.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/use-cases/${id}/sandbox?strategyId=${s.id}`)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover"
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="truncate font-medium text-foreground">{s.title}</span>
                    <Badge variant={riskVariant(s.risk)}>{s.risk} risk</Badge>
                  </span>
                  <span className={`shrink-0 font-mono text-xs ${s.predicted_revenue_delta_pct >= 0 ? "text-success" : "text-danger"}`}>
                    {formatPercent(s.predicted_revenue_delta_pct, { signed: true })}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {!strategyId && pickableStrategies && pickableStrategies.length === 0 && (
          <Card className="mb-6 p-4 text-sm text-foreground-muted">
            No decisions generated yet for this use case — run the AI pipeline first, then open the sandbox from a
            decision in the Decision Library to simulate and lock in a strategy.
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          <Card className="p-6">
            <div className="flex flex-col gap-6">
              {LEVERS.map((lever) => (
                <div key={lever.key}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{lever.label}</span>
                    <span className="font-mono text-foreground-muted">
                      {(deltas[lever.key] ?? 0) > 0 ? "+" : ""}
                      {deltas[lever.key]}%
                    </span>
                  </div>
                  <Slider
                    value={deltas[lever.key] ?? 0}
                    min={lever.min}
                    max={lever.max}
                    onValueChange={(v) => setDeltas((d) => ({ ...d, [lever.key]: v }))}
                  />
                </div>
              ))}
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Projected impact</CardTitle>
              </CardHeader>
              <CardContent>
                {result ? (
                  <motion.div key={result.predicted_revenue} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className={`flex items-center gap-2 text-3xl font-bold ${positive ? "text-success" : "text-danger"}`}>
                      {positive ? <TrendingUp className="size-6" /> : <TrendingDown className="size-6" />}
                      {formatPercent(result.predicted_revenue_delta_pct, { signed: true })}
                    </div>
                    <p className="mt-2 text-sm text-foreground-muted">
                      {formatCurrency(result.predicted_revenue, { compact: true })} projected revenue
                      ({positive ? "+" : ""}
                      {formatCurrency(result.predicted_revenue_delta, { compact: true })} vs. baseline)
                    </p>
                  </motion.div>
                ) : (
                  <p className="text-sm text-foreground-subtle">
                    {simulateMutation.isPending ? "Simulating..." : "Run the AI pipeline first to enable simulation."}
                  </p>
                )}
              </CardContent>
            </Card>

            {chartData.length > 0 && (
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Revenue by region</CardTitle>
                    <CardDescription>Baseline vs. this scenario</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "var(--color-foreground-muted)", fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, { compact: true })} />
                      <YAxis type="category" dataKey="region" width={90} tick={{ fill: "var(--color-foreground-muted)", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                        formatter={formatTooltipCurrency}
                      />
                      <Bar dataKey="baseline" fill="var(--color-border-strong)" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="scenario" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
