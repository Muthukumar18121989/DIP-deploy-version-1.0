import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Activity,
  Database,
  FlaskConical,
  Folders,
  GitBranch,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  Menu,
  Rocket,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const navItems = (useCaseId: string) => [
  { to: `/use-cases/${useCaseId}/data`, label: "Data Sources", icon: Database },
  { to: `/use-cases/${useCaseId}/experiments`, label: "Experiments", icon: FlaskConical },
  { to: `/use-cases/${useCaseId}/pipeline`, label: "AI Pipeline", icon: GitBranch },
  { to: `/use-cases/${useCaseId}/decisions`, label: "Business Decisions", icon: Lightbulb },
  { to: `/use-cases/${useCaseId}/sandbox`, label: "Sandbox", icon: SlidersHorizontal },
  { to: `/use-cases/${useCaseId}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
  { to: `/use-cases/${useCaseId}/reports`, label: "Reports", icon: LineChart },
  { to: `/use-cases/${useCaseId}/decisions?status=published`, label: "Published Strategies", icon: Rocket },
  { to: `/use-cases/${useCaseId}/monitoring`, label: "Monitoring", icon: Activity },
];

export function MobileNav({ useCaseId, useCaseName }: { useCaseId: string; useCaseName?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="secondary"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="size-4" />
      </Button>
      <DialogContent className="left-0 top-0 h-full max-w-[280px] -translate-x-0 -translate-y-0 overflow-y-auto rounded-none border-r border-l-0 border-y-0 data-[state=open]:animate-in data-[state=open]:slide-in-from-left">
        <DialogTitle className="sr-only">Navigation</DialogTitle>
        <div className="mb-6 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground">Decision OS</span>
        </div>

        <nav className="mb-4 flex flex-col gap-1">
          <NavLink
            to="/use-cases"
            end
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface hover:text-foreground",
                isActive && "bg-surface text-foreground"
              )
            }
          >
            <Folders className="size-4" />
            Use Cases
          </NavLink>
        </nav>

        {useCaseName && (
          <div className="mb-4">
            <p className="text-xs uppercase tracking-wide text-foreground-subtle">Use Case</p>
            <p className="mt-1 truncate text-sm font-medium text-foreground">{useCaseName}</p>
          </div>
        )}
        <nav className="flex flex-col gap-1">
          {navItems(useCaseId).map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface hover:text-foreground",
                  isActive && "bg-surface text-foreground"
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <nav className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
          <NavLink
            to="/settings"
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface hover:text-foreground",
                isActive && "bg-surface text-foreground"
              )
            }
          >
            <SettingsIcon className="size-4" />
            Settings
          </NavLink>
        </nav>
      </DialogContent>
    </Dialog>
  );
}
