import { useEffect } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Database,
  FlaskConical,
  Folders,
  GitBranch,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  Plus,
  Settings as SettingsIcon,
  SlidersHorizontal,
} from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, activeUseCaseId } = useUIStore();
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  function go(path: string) {
    navigate(path);
    setCommandPaletteOpen(false);
  }

  return (
    <Command.Dialog
      open={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
      label="Command palette"
      className="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl glass-strong shadow-2xl"
    >
      <Command.Input
        placeholder="Search pages, actions..."
        className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-foreground-subtle"
      />
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-foreground-muted">No results found.</Command.Empty>
        <Command.Group heading="Navigate" className="text-xs font-medium text-foreground-subtle px-2 py-1.5">
          <Command.Item
            onSelect={() => go("/use-cases")}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground data-[selected=true]:bg-surface cursor-pointer"
          >
            <Folders className="size-4" /> Use Case Repository
          </Command.Item>
          <Command.Item
            onSelect={() => go("/use-cases/new")}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground data-[selected=true]:bg-surface cursor-pointer"
          >
            <Plus className="size-4" /> New Use Case
          </Command.Item>
          <Command.Item
            onSelect={() => go("/settings")}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground data-[selected=true]:bg-surface cursor-pointer"
          >
            <SettingsIcon className="size-4" /> Settings
          </Command.Item>
          {activeUseCaseId && (
            <>
              <Command.Item
                onSelect={() => go(`/use-cases/${activeUseCaseId}/data`)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground data-[selected=true]:bg-surface cursor-pointer"
              >
                <Database className="size-4" /> Data Sources
              </Command.Item>
              <Command.Item
                onSelect={() => go(`/use-cases/${activeUseCaseId}/experiments`)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground data-[selected=true]:bg-surface cursor-pointer"
              >
                <FlaskConical className="size-4" /> Experiments
              </Command.Item>
              <Command.Item
                onSelect={() => go(`/use-cases/${activeUseCaseId}/pipeline`)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground data-[selected=true]:bg-surface cursor-pointer"
              >
                <GitBranch className="size-4" /> AI Pipeline
              </Command.Item>
              <Command.Item
                onSelect={() => go(`/use-cases/${activeUseCaseId}/decisions`)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground data-[selected=true]:bg-surface cursor-pointer"
              >
                <Lightbulb className="size-4" /> Business Decisions
              </Command.Item>
              <Command.Item
                onSelect={() => go(`/use-cases/${activeUseCaseId}/sandbox`)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground data-[selected=true]:bg-surface cursor-pointer"
              >
                <SlidersHorizontal className="size-4" /> Sandbox
              </Command.Item>
              <Command.Item
                onSelect={() => go(`/use-cases/${activeUseCaseId}/dashboard`)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground data-[selected=true]:bg-surface cursor-pointer"
              >
                <LayoutDashboard className="size-4" /> Dashboard
              </Command.Item>
              <Command.Item
                onSelect={() => go(`/use-cases/${activeUseCaseId}/reports`)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground data-[selected=true]:bg-surface cursor-pointer"
              >
                <LineChart className="size-4" /> Reports
              </Command.Item>
              <Command.Item
                onSelect={() => go(`/use-cases/${activeUseCaseId}/monitoring`)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground data-[selected=true]:bg-surface cursor-pointer"
              >
                <Activity className="size-4" /> Monitoring
              </Command.Item>
            </>
          )}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
