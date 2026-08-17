import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, Presentation } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useUseCase } from "@/lib/hooks";
import { exportDashboardToExcel, exportDashboardToPdf, exportDashboardToPptx, exportStrategyToPdf } from "@/lib/export";
import { formatPercent } from "@/lib/utils";

export default function Reports() {
  const { id } = useParams<{ id: string }>();
  const { data: useCase } = useUseCase(id);
  const [exporting, setExporting] = useState<string | null>(null);

  const { data: dashboard } = useQuery({
    queryKey: ["dashboard", id],
    queryFn: () => api.getDashboard(id!),
    enabled: !!id,
    retry: false,
  });

  const { data: strategies } = useQuery({
    queryKey: ["strategies", id],
    queryFn: () => api.listStrategies(id!),
    enabled: !!id,
  });

  async function run(key: string, action: () => void | Promise<void>) {
    setExporting(key);
    try {
      await action();
      toast.success("Exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  }

  if (!id) return null;

  return (
    <AppShell useCaseId={id} useCaseName={useCase?.name} title="Reports">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Reports</h2>
          <p className="text-sm text-foreground-muted">
            Export what's already been computed — the latest executive dashboard, or any individual decision report.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div>
              <CardTitle>Executive Dashboard</CardTitle>
              <CardDescription>Latest completed pipeline run for this use case</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {dashboard ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => run("pdf", () => exportDashboardToPdf(dashboard, useCase?.name ?? "use-case"))}
                  disabled={exporting !== null}
                >
                  <FileText className="size-3.5" /> {exporting === "pdf" ? "Exporting..." : "PDF"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => run("excel", () => exportDashboardToExcel(dashboard, useCase?.name ?? "use-case"))}
                  disabled={exporting !== null}
                >
                  <FileSpreadsheet className="size-3.5" /> {exporting === "excel" ? "Exporting..." : "Excel"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => run("pptx", () => exportDashboardToPptx(dashboard, useCase?.name ?? "use-case"))}
                  disabled={exporting !== null}
                >
                  <Presentation className="size-3.5" /> {exporting === "pptx" ? "Exporting..." : "PowerPoint"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-foreground-muted">Run the AI pipeline first to generate a dashboard.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Decision Reports</CardTitle>
              <CardDescription>Export any strategy as a standalone PDF report</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {strategies?.map((strategy) => (
                <div key={strategy.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{strategy.title}</p>
                    <p className="text-xs text-foreground-subtle">
                      {formatPercent(strategy.predicted_revenue_delta_pct, { signed: true })} · {strategy.risk} risk
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => run(strategy.id, () => exportStrategyToPdf(strategy, useCase?.name ?? "use-case"))}
                    disabled={exporting !== null}
                  >
                    <FileText className="size-3.5" /> Export
                  </Button>
                </div>
              ))}
              {(!strategies || strategies.length === 0) && (
                <p className="text-sm text-foreground-muted">No decisions generated yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
