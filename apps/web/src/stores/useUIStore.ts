import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewMode = "business" | "expert";
export type ThemeMode = "dark" | "light";

interface UIState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  activeUseCaseId: string | null;
  setActiveUseCaseId: (id: string | null) => void;
  /** Admin control (Settings page): when false, Expert Mode is hidden app-wide. */
  expertModeEnabled: boolean;
  setExpertModeEnabled: (enabled: boolean) => void;
  /** Settings → Appearance → Theme. Applied to <html data-theme> in App.tsx. */
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      viewMode: "business",
      setViewMode: (mode) => set({ viewMode: mode }),
      toggleViewMode: () => set({ viewMode: get().viewMode === "business" ? "expert" : "business" }),
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      activeUseCaseId: null,
      setActiveUseCaseId: (id) => set({ activeUseCaseId: id }),
      expertModeEnabled: true,
      setExpertModeEnabled: (enabled) =>
        set({ expertModeEnabled: enabled, viewMode: enabled ? get().viewMode : "business" }),
      themeMode: "dark",
      setThemeMode: (mode) => set({ themeMode: mode }),
    }),
    {
      name: "dip-ui-store",
      partialize: (state) => ({
        viewMode: state.viewMode,
        expertModeEnabled: state.expertModeEnabled,
        themeMode: state.themeMode,
      }),
    }
  )
);
