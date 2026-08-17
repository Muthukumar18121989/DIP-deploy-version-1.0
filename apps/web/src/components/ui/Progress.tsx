import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-500 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
