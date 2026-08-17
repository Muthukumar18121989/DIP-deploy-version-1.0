import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { useUseCase } from "@/lib/hooks";
import { formatPercent } from "@/lib/utils";

const DRIFT_THRESHOLD_PCT = 15;

export default function Monitoring() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: useCase } = useUseCase(id);

  const { data: strategies } = useQuery({
    queryKey: ["strategies", id],
    queryFn: () => api.listStrategies(id!),
    enabled: !!id,
  });

  const monitored = (strategies ?? []).filter((s) => s.lifecycle_status === "published" || s.lifecycle_status === "monitoring");

  if (!id) return null;

  return (
    <AppShell useCaseId={id} useCaseName={useCase?.name} title="Monitoring">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Actual vs. expected</h2>
          <p className="text-sm text-foreground-muted">
            Track how published strategies perform against their predictions. Record actual results as they come in —
            there's no live data feed connected here, so this is entered manually.
          </p>
        </div>

        {monitored.length === 0 && (
          <Card className="p-8 text-center text-sm text-foreground-muted">
            No published strategies yet. Publish one from the{" "}
            <button onClick={() => navigate(`/use-cases/${id}/decisions`)} className="text-primary hover:underline">
              Decision Library
            </button>{" "}
            to start monitoring it here.
          </Card>
        )}

        <div className="flex flex-col gap-4">
          {monitored.map((strategy) => (
            <StrategyMonitor key={strategy.id} strategyId={strategy.id} title={strategy.title} expected={strategy.predicted_revenue_delta_pct} useCaseId={id} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function StrategyMonitor({
  strategyId,
  title,
  expected,
  useCaseId,
}: {
  strategyId: string;
  title: string;
  expected: number;
  useCaseId: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actual, setActual] = useState("");
  const [note, setNote] = useState("");

  const { data: history } = useQuery({
    queryKey: ["monitoring", strategyId],
    queryFn: () => api.listMonitoring(strategyId),
  });

  const mutation = useMutation({
    mutationFn: () => api.recordMonitoring(strategyId, Number(actual), note),
    onSuccess: () => {
      toast.success("Recorded");
      setActual("");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["monitoring", strategyId] });
      queryClient.invalidateQueries({ queryKey: ["strategies", useCaseId] });
    },
  });

  const latest = history?.[0];
  const breached = latest && Math.abs(latest.variance_pct) > DRIFT_THRESHOLD_PCT;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Expected: {formatPercent(expected, { signed: true })} revenue impact</CardDescription>
        </div>
        {latest &&
          (breached ? (
            <Badge variant="danger">
              <AlertTriangle className="size-3" /> {Math.abs(latest.variance_pct).toFixed(1)}% drift
            </Badge>
          ) : (
            <Badge variant="success">
              <CheckCircle2 className="size-3" /> On track
            </Badge>
          ))}
      </CardHeader>
      <CardContent>
        {history && history.length > 0 && (
          <div className="mb-4 flex flex-col gap-1.5">
            {history.map((snap) => (
              <div key={snap.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-xs">
                <span className="text-foreground-muted">{new Date(snap.recorded_at).toLocaleDateString()}</span>
                <span className="text-foreground">Actual: {formatPercent(snap.actual_revenue_delta_pct, { signed: true })}</span>
                <span className={Math.abs(snap.variance_pct) > DRIFT_THRESHOLD_PCT ? "text-danger" : "text-success"}>
                  Variance: {formatPercent(snap.variance_pct, { signed: true })}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`actual-${strategyId}`}>Actual revenue impact (%)</Label>
            <Input
              id={`actual-${strategyId}`}
              type="number"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              placeholder="e.g. 6.2"
              className="w-40"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor={`note-${strategyId}`}>Note</Label>
            <Input id={`note-${strategyId}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!actual || mutation.isPending}>
            Record
          </Button>
        </div>

        {breached && (
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => navigate(`/use-cases/${useCaseId}/sandbox?strategyId=${strategyId}`)}
          >
            <RefreshCw className="size-3.5" /> Rerun AI with updated assumptions
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
