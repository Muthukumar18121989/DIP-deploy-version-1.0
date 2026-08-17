import { create } from "zustand";
import { persist, type PersistOptions } from "zustand/middleware";
import { api } from "@/lib/api";
import type { PipelineEvent } from "@/lib/types";

export interface PipelineRunState {
  events: Record<string, PipelineEvent>;
  selectedStage: string | null;
  running: boolean;
  completedAt: number | null;
}

const EMPTY_RUN: PipelineRunState = { events: {}, selectedStage: null, running: false, completedAt: null };

// The live EventSource connection is kept OUTSIDE React/Zustand state — it's
// not serializable, and more importantly it must keep receiving stage events
// even while the user is on a different page. Zustand state below is what
// every page reads to render progress; this map is what keeps the run alive.
const eventSources: Record<string, EventSource> = {};

interface PipelineStore {
  runs: Record<string, PipelineRunState>;
  selectStage: (useCaseId: string, stage: string) => void;
  runPipeline: (useCaseId: string, onComplete?: () => void) => void;
  isConnected: (useCaseId: string) => boolean;
}

export const usePipelineStore = create<PipelineStore>()(
  persist(
    (set) => ({
      runs: {},

      selectStage: (useCaseId, stage) =>
        set((state) => ({
          runs: {
            ...state.runs,
            [useCaseId]: { ...(state.runs[useCaseId] ?? EMPTY_RUN), selectedStage: stage },
          },
        })),

      runPipeline: (useCaseId, onComplete) => {
        eventSources[useCaseId]?.close();

        set((state) => ({
          runs: { ...state.runs, [useCaseId]: { ...EMPTY_RUN, running: true } },
        }));

        const source = new EventSource(api.pipelineStreamUrl(useCaseId));
        eventSources[useCaseId] = source;

        source.onmessage = (msg) => {
          const payload: PipelineEvent = JSON.parse(msg.data);

          if (payload.stage === "error") {
            source.close();
            delete eventSources[useCaseId];
            set((state) => ({
              runs: { ...state.runs, [useCaseId]: { ...(state.runs[useCaseId] ?? EMPTY_RUN), running: false } },
            }));
            return;
          }

          set((state) => {
            const run = state.runs[useCaseId] ?? EMPTY_RUN;
            return {
              runs: {
                ...state.runs,
                [useCaseId]: {
                  ...run,
                  events: { ...run.events, [payload.stage]: payload },
                  selectedStage: payload.stage,
                },
              },
            };
          });

          if (payload.stage === "final_dashboard" && payload.status === "complete") {
            source.close();
            delete eventSources[useCaseId];
            set((state) => ({
              runs: {
                ...state.runs,
                [useCaseId]: { ...(state.runs[useCaseId] ?? EMPTY_RUN), running: false, completedAt: Date.now() },
              },
            }));
            onComplete?.();
          }
        };

        source.onerror = () => {
          source.close();
          delete eventSources[useCaseId];
          set((state) => ({
            runs: { ...state.runs, [useCaseId]: { ...(state.runs[useCaseId] ?? EMPTY_RUN), running: false } },
          }));
        };
      },

      isConnected: (useCaseId) => !!eventSources[useCaseId],
    }),
    {
      name: "dip-pipeline-store",
      storage: {
        getItem: (name) => {
          const value = sessionStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => sessionStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
      partialize: (state) => ({ runs: state.runs }),
      onRehydrateStorage: () => (state) => {
        // A hard refresh always kills any in-flight EventSource, so a run
        // that was mid-stream when the page reloaded is stale, not live —
        // reflect that instead of showing a spinner that will never resolve.
        if (!state) return;
        for (const run of Object.values(state.runs)) {
          if (run.running) run.running = false;
        }
      },
    } satisfies PersistOptions<PipelineStore, Pick<PipelineStore, "runs">>
  )
);

export function usePipelineRun(useCaseId: string | undefined): PipelineRunState {
  return usePipelineStore((state) => (useCaseId ? state.runs[useCaseId] ?? EMPTY_RUN : EMPTY_RUN));
}
