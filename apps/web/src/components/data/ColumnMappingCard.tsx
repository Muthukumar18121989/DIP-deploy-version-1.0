import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Columns3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import type { MappingRole } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const GROUPS: { key: MappingRole["group"]; title: string; hint: string }[] = [
  { key: "kpi", title: "What to explain", hint: "Required." },
  { key: "time", title: "When", hint: "A Date column, or Year and Month." },
  { key: "dimension", title: "Where and what", hint: "Optional. Lets DIP break results down and target regions." },
  { key: "lever", title: "Levers you control", hint: "Optional. DIP only recommends changes to the levers you map here." },
  { key: "driver", title: "Other drivers", hint: "Optional. Extra signals that can improve the model." },
];

const NONE = "";

/** Lets a user say which of their own spreadsheet columns plays each role
 * (date, KPI, region, price, ...). Prefilled from the server's guess based on
 * column names; nothing is applied until the user confirms. */
export function ColumnMappingCard({ useCaseId }: { useCaseId: string }) {
  const queryClient = useQueryClient();
  const { data: screen, isLoading } = useQuery({
    queryKey: ["column-mapping", useCaseId],
    queryFn: () => api.getMapping(useCaseId),
    retry: false,
  });
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    if (screen) setMapping(screen.current_mapping ?? screen.suggested_mapping);
  }, [screen]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.saveMapping(
        useCaseId,
        Object.fromEntries(Object.entries(mapping).filter(([, column]) => column !== NONE))
      ),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["use-case", useCaseId] });
      queryClient.invalidateQueries({ queryKey: ["data-quality", useCaseId] });
      queryClient.invalidateQueries({ queryKey: ["column-mapping", useCaseId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const usedBy = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [role, column] of Object.entries(mapping)) if (column) out[column] = role;
    return out;
  }, [mapping]);

  const hasTime = !!mapping.date || (!!mapping.year && !!mapping.month);
  const ready = !!mapping.revenue && hasTime;

  if (isLoading) return null;
  if (!screen) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Columns3 className="size-4 text-warning" /> Match your columns
          </CardTitle>
          <CardDescription className="mt-2 max-w-2xl">
            Your file has {formatNumber(screen.row_count)} rows and {screen.columns.length} columns. Tell DIP what
            each column means. We've guessed from the column names; check the guesses and fill any gaps.
          </CardDescription>
        </div>
        <Badge variant="warning">Action needed</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {GROUPS.map((group) => {
            const roles = screen.roles.filter((r) => r.group === group.key);
            return (
              <section key={group.key}>
                <div className="mb-2 flex items-baseline gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{group.title}</h4>
                  <span className="text-xs text-foreground-subtle">{group.hint}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {roles.map((role) => {
                    const value = mapping[role.key] ?? NONE;
                    const sample = value ? screen.samples[value]?.join(", ") : null;
                    return (
                      <label key={role.key} className="block rounded-lg border border-border bg-surface p-3">
                        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                          {role.label}
                          {role.required && <Badge variant="primary">Required</Badge>}
                        </span>
                        <span className="mt-0.5 block text-xs text-foreground-subtle">{role.help}</span>
                        <select
                          aria-label={role.label}
                          className="mt-2 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
                          value={value}
                          onChange={(e) => setMapping((m) => ({ ...m, [role.key]: e.target.value }))}
                        >
                          <option value={NONE}>Not in my data</option>
                          {screen.columns.map((column) => (
                            <option key={column} value={column} disabled={!!usedBy[column] && usedBy[column] !== role.key}>
                              {column}
                            </option>
                          ))}
                        </select>
                        {sample && <span className="mt-1 block truncate text-xs text-foreground-subtle">e.g. {sample}</span>}
                      </label>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={() => saveMutation.mutate()} disabled={!ready || saveMutation.isPending}>
            {saveMutation.isPending ? "Checking your data..." : "Confirm columns"}
          </Button>
          {!ready && (
            <span className="text-xs text-foreground-subtle">
              Choose the KPI to explain and a Date column (or Year and Month) to continue.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
