import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "good" | "warning" | "critical";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-foreground-subtle">{label}</p>
          <p
            className={cn(
              "mt-1.5 text-2xl font-semibold tabular-nums",
              tone === "good" && "text-success",
              tone === "warning" && "text-warning",
              tone === "critical" && "text-danger",
              tone === "default" && "text-foreground"
            )}
          >
            {value}
          </p>
        </div>
        <Icon className="size-4 text-foreground-subtle" />
      </div>
    </Card>
  );
}
