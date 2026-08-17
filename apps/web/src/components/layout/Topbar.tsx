import { Command, LayoutGrid, Microscope } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useUIStore } from "@/stores/useUIStore";
import { cn } from "@/lib/utils";
import { AuthWidget } from "./AuthWidget";
import { MobileNav } from "./MobileNav";

export function Topbar({ title, useCaseId, useCaseName }: { title: string; useCaseId: string; useCaseName?: string }) {
  const { viewMode, setViewMode, setCommandPaletteOpen, expertModeEnabled } = useUIStore();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background-elevated/60 px-4 backdrop-blur-xl sm:px-6">
      <MobileNav useCaseId={useCaseId} useCaseName={useCaseName} />
      <h1 className="mr-auto truncate text-base font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-1 rounded-lg border border-border bg-surface p-1 xs:flex" role="group" aria-label="View mode">
          <button
            onClick={() => setViewMode("business")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              viewMode === "business" ? "bg-primary text-primary-foreground" : "text-foreground-muted hover:text-foreground"
            )}
            aria-pressed={viewMode === "business"}
          >
            <LayoutGrid className="size-3.5" />
            Business
          </button>
          {expertModeEnabled && (
            <button
              onClick={() => setViewMode("expert")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                viewMode === "expert" ? "bg-primary text-primary-foreground" : "text-foreground-muted hover:text-foreground"
              )}
              aria-pressed={viewMode === "expert"}
            >
              <Microscope className="size-3.5" />
              Expert
            </button>
          )}
        </div>

        <Button variant="secondary" size="sm" onClick={() => setCommandPaletteOpen(true)}>
          <Command className="size-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded border border-border-strong bg-background px-1.5 py-0.5 text-[10px] text-foreground-subtle sm:inline">
            ⌘K
          </kbd>
        </Button>
        <AuthWidget />
      </div>
    </header>
  );
}
