import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { UseCaseCard } from "@/components/repository/UseCaseCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";

function CardSkeleton() {
  return (
    <Card className="h-72 animate-pulse p-5">
      <div className="mb-3 h-4 w-2/3 rounded bg-surface-hover" />
      <div className="mb-6 h-3 w-full rounded bg-surface-hover" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-surface-hover" />
        ))}
      </div>
    </Card>
  );
}

export default function UseCaseRepository() {
  const [showArchived, setShowArchived] = useState(false);
  const { data: useCases, isLoading } = useQuery({
    queryKey: ["use-cases"],
    queryFn: api.listUseCases,
  });

  const visible = (useCases ?? []).filter((uc) => showArchived || !uc.archived);

  return (
    <WorkspaceShell title="Use Case Repository">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Your business use cases</h2>
            <p className="text-sm text-foreground-muted">Every use case, its AI progress, and its current recommended strategy — all in one place.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? "Hide archived" : "Show archived"}
            </Button>
            <Button asChild>
              <Link to="/use-cases/new">
                <Plus className="size-4" /> New Use Case
              </Link>
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && visible.length === 0 && (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <p className="text-sm text-foreground-muted">No use cases yet — create your first one to get started.</p>
            <Button asChild>
              <Link to="/use-cases/new">
                <Plus className="size-4" /> New Use Case
              </Link>
            </Button>
          </Card>
        )}

        {!isLoading && visible.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((useCase, i) => (
              <UseCaseCard key={useCase.id} useCase={useCase} index={i} />
            ))}
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
