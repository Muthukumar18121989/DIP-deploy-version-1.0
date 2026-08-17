import { Moon, Sun } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { useUIStore } from "@/stores/useUIStore";

export default function Settings() {
  const { expertModeEnabled, setExpertModeEnabled, themeMode, setThemeMode } = useUIStore();

  return (
    <WorkspaceShell title="Settings">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Admin settings</h2>
          <p className="text-sm text-foreground-muted">Configure what's available across the whole workspace.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex-1">
              <CardTitle>Expert Mode</CardTitle>
              <CardDescription>
                Controls whether the Expert Mode toggle (feature importance, model metrics, training curves, pipeline
                internals) is available anywhere in the platform. Turning this off restricts everyone to the simplified
                Business Mode view.
              </CardDescription>
            </div>
            <Switch checked={expertModeEnabled} onCheckedChange={setExpertModeEnabled} aria-label="Enable Expert Mode" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-foreground-subtle">
              Currently: <span className="font-medium text-foreground">{expertModeEnabled ? "Enabled" : "Disabled"}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <div className="flex-1">
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Choose how the workspace looks. Dark is the default theme. Light is a monochrome, high-density
                enterprise look built for data-first screens.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div role="group" aria-label="Theme" className="inline-flex rounded-md border border-border p-1">
              <button
                type="button"
                aria-pressed={themeMode === "dark"}
                onClick={() => setThemeMode("dark")}
                className={`flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                  themeMode === "dark"
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                <Moon className="h-4 w-4" aria-hidden="true" />
                Dark
              </button>
              <button
                type="button"
                aria-pressed={themeMode === "light"}
                onClick={() => setThemeMode("light")}
                className={`flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                  themeMode === "light"
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                <Sun className="h-4 w-4" aria-hidden="true" />
                Light
              </button>
            </div>
            <p className="mt-3 text-xs text-foreground-subtle">
              Currently: <span className="font-medium text-foreground">{themeMode === "dark" ? "Dark" : "Light"}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </WorkspaceShell>
  );
}
