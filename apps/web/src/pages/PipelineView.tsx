import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Play, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { StageNode, StageDetailPanel } from "@/components/pipeline/StageNode";
import { PIPELINE_STAGES } from "@/lib/pipelineStages";
import { useUseCase } from "@/lib/hooks";
import { useUIStore } from "@/stores/useUIStore";
import { usePipelineRun, usePipelineStore } from "@/stores/usePipelineStore";

export default function PipelineView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const viewMode = useUIStore((s) => s.viewMode);
  const { data: useCase } = useUseCase(id);

  const run = usePipelineRun(id);
  const { runPipeline, selectStage } = usePipelineStore();

  function startRun() {
    if (!id) return;
    runPipeline(id, () => {
      queryClient.invalidateQueries({ queryKey: ["use-case", id] });
      queryClient.invalidateQueries({ queryKey: ["experiments", id] });
      queryClient.invalidateQueries({ queryKey: ["strategies", id] });
      toast.success("Pipeline complete — decisions and dashboard are ready.");
    });
  }

  const completedCount = PIPELINE_STAGES.filter((s) => run.events[s.key]?.status === "complete").length;
  const progress = (completedCount / PIPELINE_STAGES.length) * 100;
  const isDone = completedCount === PIPELINE_STAGES.length;
  const activeEvent = run.selectedStage ? run.events[run.selectedStage] : undefined;

  if (!id) return null;

  return (
    <AppShell useCaseId={id} useCaseName={useCase?.name} title="AI Pipeline">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Watch the AI think</h2>
            <p className="text-sm text-foreground-muted">
              Every stage below runs real computation against your data — nothing is pre-scripted. Navigate away
              anytime; the run keeps going and picks up right where you left it.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={startRun} disabled={run.running}>
              {run.running ? "Running..." : completedCount > 0 ? <RotateCcw className="size-4" /> : <Play className="size-4" />}
              {run.running ? "Running..." : completedCount > 0 ? "Re-run pipeline" : "Run AI Pipeline"}
            </Button>
            {isDone && (
              <Button variant="secondary" onClick={() => navigate(`/use-cases/${id}/decisions`)}>
                View decisions <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {(run.running || completedCount > 0) && (
          <div className="mb-6">
            <Progress value={progress} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col gap-2">
            {PIPELINE_STAGES.map((stage) => (
              <StageNode
                key={stage.key}
                label={stage.label}
                icon={stage.icon}
                status={run.events[stage.key]?.status ?? "pending"}
                active={run.selectedStage === stage.key}
                onClick={() => selectStage(id, stage.key)}
              />
            ))}
          </div>

          <Card className="min-h-[420px] p-6">
            <StageDetailPanel event={activeEvent} expert={viewMode === "expert"} />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
