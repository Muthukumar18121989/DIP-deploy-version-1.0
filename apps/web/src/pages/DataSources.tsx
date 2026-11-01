import { useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Database, Sparkles, Upload } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConnectorConfigDialog } from "@/components/connectors/ConnectorConfigDialog";
import { ColumnMappingCard } from "@/components/data/ColumnMappingCard";
import { SOURCE_CONNECTORS } from "@/lib/connectors";
import { api } from "@/lib/api";
import { useUseCase } from "@/lib/hooks";
import { formatNumber } from "@/lib/utils";

export default function DataSources() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: useCase } = useUseCase(id);
  const { data: connectors } = useQuery({
    queryKey: ["connectors", id],
    queryFn: () => api.listConnectors(id!),
    enabled: !!id,
  });
  const { data: quality } = useQuery({
    queryKey: ["data-quality", id],
    queryFn: () => api.getDataQuality(id!),
    enabled: !!id && useCase?.status !== "created" && useCase?.status !== "needs_mapping",
    retry: false,
  });

  const generateMutation = useMutation({
    mutationFn: () => api.generateData(id!),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["use-case", id] });
      queryClient.invalidateQueries({ queryKey: ["data-quality", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadData(id!, file),
    onSuccess: (res) => {
      if (res.needs_mapping) toast.info(res.message);
      else toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["use-case", id] });
      queryClient.invalidateQueries({ queryKey: ["data-quality", id] });
      queryClient.invalidateQueries({ queryKey: ["column-mapping", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!id) return null;

  return (
    <AppShell useCaseId={id} useCaseName={useCase?.name} title="Data Sources">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </div>
              <Badge variant="success">Functional</Badge>
            </CardHeader>
            <CardContent>
              <CardTitle>Generate synthetic dataset</CardTitle>
              <CardDescription>
                150,000 realistic Sales transactions across 24 months, with a genuine Q2 demand
                shock baked in for the AI to discover.
              </CardDescription>
              <Button
                className="mt-4 w-full"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? "Generating..." : "Generate dataset"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex size-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Upload className="size-4" />
              </div>
              <Badge variant="success">Functional</Badge>
            </CardHeader>
            <CardContent>
              <CardTitle>Upload CSV</CardTitle>
              <CardDescription>
                Upload your own sales export. You'll match its columns (date, the KPI to explain,
                region, price, marketing and so on) on the next step. At least 6 months of history.
              </CardDescription>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadMutation.mutate(file);
                }}
              />
              <Button
                variant="secondary"
                className="mt-4 w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Uploading..." : "Choose CSV file"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {useCase?.status === "needs_mapping" && <ColumnMappingCard useCaseId={id} />}

        {quality && useCase?.status !== "needs_mapping" && (
          <Card className="mb-8">
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" /> Data ready
                </CardTitle>
                <CardDescription className="mt-2 max-w-2xl">{quality.summary_plain_english}</CardDescription>
              </div>
              <Badge variant={quality.data_quality_score > 90 ? "success" : quality.data_quality_score > 70 ? "warning" : "danger"}>
                {quality.data_quality_score}/100
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-muted">
                <span>{formatNumber(quality.row_count)} rows</span>
                <span>{quality.column_count} columns</span>
                <span>{quality.duplicate_rows} duplicate rows</span>
              </div>
              <Button className="mt-5" onClick={() => navigate(`/use-cases/${id}/pipeline`)}>
                Continue to AI Pipeline <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mb-4 flex items-center gap-2">
          <Database className="size-4 text-foreground-muted" />
          <h2 className="text-sm font-semibold text-foreground">More connectors</h2>
          <span className="text-xs text-foreground-subtle">
            Configuration is saved for reference — these don't reach a live external system here.
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SOURCE_CONNECTORS.map((connector) => {
            const existing = connectors?.find((c) => c.connector_key === connector.key);
            return (
              <ConnectorConfigDialog
                key={connector.key}
                useCaseId={id}
                connector={connector}
                kind="source"
                existing={existing}
                trigger={
                  <button className="flex flex-col items-start gap-2 rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:border-border-strong hover:bg-surface-hover">
                    <span className="text-xs font-medium text-foreground-subtle">{connector.category}</span>
                    <span className="text-sm font-medium text-foreground">{connector.label}</span>
                    {existing ? (
                      <Badge variant="accent" className="mt-1">Configured</Badge>
                    ) : (
                      <span className="text-xs text-foreground-subtle">Not connected</span>
                    )}
                  </button>
                }
              />
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
