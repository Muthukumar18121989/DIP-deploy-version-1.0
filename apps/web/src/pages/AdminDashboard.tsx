import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Database, Shield, Users } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { USE_CASE_STATUS_LABELS } from "@/lib/statusLabels";
import type { AdminUser } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user === null) navigate("/login?redirect=/admin");
    else if (user.role !== "admin") navigate("/use-cases");
  }, [user, navigate]);

  const { data: users, isLoading, isError } = useQuery({
    queryKey: ["admin-users"],
    queryFn: api.listAdminUsers,
    enabled: user?.role === "admin",
  });

  if (!user || user.role !== "admin") return null;

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalUseCases = (users ?? []).reduce((sum: number, u: AdminUser) => sum + u.use_case_count, 0);

  return (
    <WorkspaceShell title="Admin Dashboard">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Users & their data</h2>
            <p className="text-sm text-foreground-muted">
              Every registered account, the use cases they've created, and the data source each one is connected to.
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs text-foreground-subtle">Registered users</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{users?.length ?? "—"}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-foreground-subtle">Attributed use cases</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{totalUseCases}</p>
          </Card>
        </div>

        {isLoading && <p className="text-sm text-foreground-muted">Loading users...</p>}
        {isError && <p className="text-sm text-danger">Couldn't load users — you may need to sign in again.</p>}

        {users && users.length === 0 && (
          <Card className="p-8 text-center text-sm text-foreground-muted">No registered users yet.</Card>
        )}

        <div className="flex flex-col gap-3">
          {users?.map((entry: AdminUser) => {
            const isOpen = expanded.has(entry.user.id);
            return (
              <Card key={entry.user.id}>
                <button
                  onClick={() => toggle(entry.user.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="size-4 text-foreground-subtle" /> : <ChevronRight className="size-4 text-foreground-subtle" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{entry.user.name}</span>
                        {entry.user.role === "admin" && <Badge variant="primary">Admin</Badge>}
                      </div>
                      <p className="text-xs text-foreground-subtle">{entry.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-foreground-subtle">
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" /> {entry.use_case_count} use case{entry.use_case_count === 1 ? "" : "s"}
                    </span>
                    <span>Joined {formatDate(entry.user.created_at)}</span>
                  </div>
                </button>

                {isOpen && (
                  <CardContent className="pt-0">
                    {entry.use_cases.length === 0 ? (
                      <p className="pl-7 text-xs text-foreground-subtle">No use cases created yet.</p>
                    ) : (
                      <div className="flex flex-col gap-2 pl-7">
                        {entry.use_cases.map((uc) => {
                          const status = USE_CASE_STATUS_LABELS[uc.status as keyof typeof USE_CASE_STATUS_LABELS];
                          return (
                            <div
                              key={uc.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                            >
                              <div>
                                <p className="font-medium text-foreground">{uc.name}</p>
                                <p className="flex items-center gap-1.5 text-xs text-foreground-subtle">
                                  <Database className="size-3 shrink-0" />
                                  {uc.data_source ? `${uc.data_source} · ${uc.row_count?.toLocaleString() ?? "?"} rows` : "No data uploaded yet"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {uc.archived && <Badge variant="default">Archived</Badge>}
                                {status && <Badge variant={status.variant}>{status.label}</Badge>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </WorkspaceShell>
  );
}
