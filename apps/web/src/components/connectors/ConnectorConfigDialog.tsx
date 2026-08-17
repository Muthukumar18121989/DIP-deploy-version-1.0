import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import type { ConnectorDef } from "@/lib/connectors";
import type { ConnectorConfig } from "@/lib/types";

export function ConnectorConfigDialog({
  useCaseId,
  connector,
  kind,
  existing,
  trigger,
}: {
  useCaseId: string;
  connector: ConnectorDef;
  kind: "source" | "publish";
  existing?: ConnectorConfig;
  trigger: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(
    (existing?.config as Record<string, string>) ?? {}
  );

  const mutation = useMutation({
    mutationFn: () => api.upsertConnector(useCaseId, connector.key, kind, values),
    onSuccess: () => {
      toast.success(`${connector.label} configuration saved`, {
        description: "Not connected — this environment can't reach a live external system.",
      });
      queryClient.invalidateQueries({ queryKey: ["connectors", useCaseId] });
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogTitle>Connect {connector.label}</DialogTitle>
        <DialogDescription>
          Configuration is saved for this use case. No live connection is made to {connector.label} —
          there's no way to reach a real external system from this environment.
        </DialogDescription>

        <div className="mt-5 flex flex-col gap-4">
          {connector.fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              />
            </div>
          ))}
          {existing && <Badge variant="accent">Previously configured</Badge>}
        </div>

        <Button className="mt-6 w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Save configuration"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
