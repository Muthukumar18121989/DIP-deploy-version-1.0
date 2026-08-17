import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  Copy,
  Download,
  History,
  Pencil,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EditUseCaseDialog } from "./EditUseCaseDialog";
import { api } from "@/lib/api";
import { USE_CASE_STATUS_LABELS } from "@/lib/statusLabels";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { UseCaseSummary } from "@/lib/types";

export function UseCaseCard({ useCase, index }: { useCase: UseCaseSummary; index: number }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const statusMeta = USE_CASE_STATUS_LABELS[useCase.status];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["use-cases"] });

  const duplicateMutation = useMutation({
    mutationFn: () => api.duplicateUseCase(useCase.id),
    onSuccess: (dup) => {
      toast.success(`Duplicated as "${dup.name}"`);
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: () => api.updateUseCase(useCase.id, { archived: !useCase.archived }),
    onSuccess: () => {
      toast.success(useCase.archived ? "Restored from archive" : "Archived");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteUseCase(useCase.id),
    onSuccess: () => {
      toast.success("Use case deleted");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function handleExport() {
    if (!useCase.active_strategy_id) {
      toast.warning("Run the AI pipeline first — there's nothing to export yet.");
      return;
    }
    try {
      const dashboard = await api.getDashboard(useCase.id);
      const { exportDashboardToPdf } = await import("@/lib/export");
      exportDashboardToPdf(dashboard, useCase.name);
      toast.success("PDF exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
    >
      <Card className={`flex h-full flex-col p-5 ${useCase.archived ? "opacity-60" : ""}`}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to={`/use-cases/${useCase.id}/data`} className="truncate text-sm font-semibold text-foreground hover:text-primary">
              {useCase.name}
            </Link>
            <p className="mt-1 line-clamp-2 text-xs text-foreground-muted">{useCase.objective}</p>
          </div>
          <Badge variant={statusMeta.variant} className="shrink-0">
            {statusMeta.label}
          </Badge>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="default">{useCase.industry}</Badge>
          <Badge variant="default">Owner: {useCase.owner}</Badge>
          {useCase.tags.map((tag) => (
            <Badge key={tag} variant="accent">
              {tag}
            </Badge>
          ))}
          {useCase.archived && <Badge variant="danger">Archived</Badge>}
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-border bg-surface p-2.5">
            <p className="text-foreground-subtle">AI Completion</p>
            <p className="mt-1 font-semibold text-foreground">{useCase.ai_completion_pct}%</p>
            <Progress value={useCase.ai_completion_pct} className="mt-1.5" />
          </div>
          <div className="rounded-lg border border-border bg-surface p-2.5">
            <p className="text-foreground-subtle">Decisions Generated</p>
            <p className="mt-1 font-semibold text-foreground">{formatNumber(useCase.decisions_count)}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-2.5">
            <p className="text-foreground-subtle">Current KPI ({useCase.kpi})</p>
            <p className="mt-1 font-semibold text-foreground">
              {useCase.current_kpi !== null ? formatCurrency(useCase.current_kpi, { compact: true }) : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-2.5">
            <p className="text-foreground-subtle">Current ROI</p>
            <p className="mt-1 font-semibold text-foreground">
              {useCase.current_roi !== null ? `${useCase.current_roi}x` : "—"}
            </p>
          </div>
        </div>

        {useCase.active_strategy_name && (
          <p className="mb-3 truncate text-xs text-foreground-muted">
            Active strategy: <span className="text-foreground">{useCase.active_strategy_name}</span>
          </p>
        )}

        <div className="mb-4 flex items-center justify-between text-[11px] text-foreground-subtle">
          <span>Created {new Date(useCase.created_at).toLocaleDateString()}</span>
          <span>Updated {new Date(useCase.updated_at).toLocaleDateString()}</span>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-border pt-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/use-cases/${useCase.id}/data`)} title="View">
            View
          </Button>
          <EditUseCaseDialog
            useCase={useCase}
            trigger={
              <Button variant="ghost" size="icon" title="Edit">
                <Pencil className="size-3.5" />
              </Button>
            }
          />
          <Button variant="ghost" size="icon" title="Duplicate" onClick={() => duplicateMutation.mutate()} disabled={duplicateMutation.isPending}>
            <Copy className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={useCase.archived ? "Restore" : "Archive"}
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isPending}
          >
            {useCase.archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" title="Export PDF" onClick={handleExport}>
            <Download className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" title="Version History" onClick={() => navigate(`/use-cases/${useCase.id}/experiments`)}>
            <History className="size-3.5" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon" title="Delete" className="text-danger hover:text-danger">
                <Trash2 className="size-3.5" />
              </Button>
            }
            title={`Delete "${useCase.name}"?`}
            description="This permanently removes the use case, every experiment version, and every generated strategy. This can't be undone."
            confirmLabel="Delete"
            destructive
            onConfirm={() => deleteMutation.mutateAsync()}
          />
        </div>
      </Card>
    </motion.div>
  );
}
