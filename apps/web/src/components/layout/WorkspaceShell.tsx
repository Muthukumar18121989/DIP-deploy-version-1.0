import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Command, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useUIStore } from "@/stores/useUIStore";
import { AuthWidget } from "./AuthWidget";

/** Layout for pages that aren't scoped to a single use case (the Use Case
 * Repository, Settings) — same visual language as AppShell's Topbar, but
 * without a per-use-case Sidebar. */
export function WorkspaceShell({ title, children }: { title: string; children: ReactNode }) {
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="flex h-16 items-center justify-between border-b border-border bg-background-elevated/60 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-2">
          <Link to="/use-cases" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Sparkles className="size-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-foreground">Decision OS</span>
          </Link>
          <span className="text-foreground-subtle">/</span>
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
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
      <main id="main-content" className="p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
