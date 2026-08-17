import { Button } from "@/components/ui/Button";
import type { WidgetChanges } from "@/lib/widgetTypes";

export function WidgetCommandPreview({
  explanation,
  changes,
  onApply,
  onCancel,
  applying,
}: {
  explanation: string;
  changes: WidgetChanges;
  onApply: () => void;
  onCancel: () => void;
  applying: boolean;
}) {
  const summary = Object.entries(changes)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5">
      <p className="text-xs text-foreground">{explanation}</p>
      {summary.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-0.5 text-[11px] text-foreground-subtle">
          {summary.map((line) => (
            <li key={line}>• {line}</li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex gap-1.5">
        <Button size="sm" onClick={onApply} disabled={applying} aria-label="Apply changes">
          {applying ? "Applying..." : "Apply Changes"}
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancel} disabled={applying} aria-label="Cancel">
          Cancel
        </Button>
      </div>
    </div>
  );
}
