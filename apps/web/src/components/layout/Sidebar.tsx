import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  Database,
  FlaskConical,
  Folders,
  GitBranch,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  Rocket,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
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

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface hover:text-foreground",
    isActive && "bg-surface text-foreground shadow-[0_0_0_1px_rgba(124,108,246,0.25)_inset]"
  );

export function Sidebar({ useCaseId, useCaseName }: { useCaseId: string; useCaseName?: string }) {
  const location = useLocation();
  const currentPath = location.pathname + location.search;

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-background-elevated/60 backdrop-blur-xl">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
          <Sparkles className="size-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-foreground">Decision OS</span>
      </div>

      <nav className="px-3">
        <NavLink to="/use-cases" end className={linkClass}>
          <Folders className="size-4" />
          Use Cases
        </NavLink>
      </nav>

      {useCaseName && (
        <div className="px-5 pb-2 pt-4">
          <p className="text-xs uppercase tracking-wide text-foreground-subtle">Use Case</p>
          <p className="mt-1 truncate text-sm font-medium text-foreground">{useCaseName}</p>
        </div>
      )}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {navItems(useCaseId).map((item) => {
          const isActive = item.to.includes("?") ? currentPath === item.to : location.pathname === item.to;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface hover:text-foreground",
                isActive && "bg-surface text-foreground shadow-[0_0_0_1px_rgba(124,108,246,0.25)_inset]"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <nav className="px-3 pb-4">
        <NavLink to="/settings" className={linkClass}>
          <SettingsIcon className="size-4" />
          Settings
        </NavLink>
      </nav>
    </aside>
  );
}
