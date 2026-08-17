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

// Pending re-checks for a run this tab is no longer streaming (see restoreRun).
// Kept out of state for the same reason as the EventSources above.
const restorePolls: Record<string, ReturnType<typeof setTimeout>> = {};
const restoreStalls: Record<string, number> = {};
const RESTORE_POLL_MS = 2500;
// A run whose event count hasn't moved for this many polls is treated as
// abandoned rather than slow. The pipeline executes inside its SSE response,
// so whichever tab started a run also ends it by disconnecting — an
// experiment can therefore sit at "running" forever, and polling one of those
// would never terminate on its own.
const RESTORE_STALL_LIMIT = 8;

interface PipelineStore {
  runs: Record<string, PipelineRunState>;
  selectStage: (useCaseId: string, stage: string) => void;
  runPipeline: (useCaseId: string, onComplete?: () => void) => void;
  restoreRun: (useCaseId: string) => Promise<void>;
  stopRestorePolling: (useCaseId: string) => void;
  isConnected: (useCaseId: string) => boolean;
}

export const usePipelineStore = create<PipelineStore>()(
  persist(
    (set, get) => ({
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
        // A live stream supersedes any pending restore of an older run.
        clearTimeout(restorePolls[useCaseId]);
        delete restorePolls[useCaseId];
        delete restoreStalls[useCaseId];

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

      // Run state above lives in sessionStorage, which is scoped to one tab:
      // a fresh tab, another browser, or another device has none of it, and
      // the pipeline reads as never-run even though the decisions and
      // dashboard it produced are sitting right there. Pull the most recent
      // run's stages back from the server to close that gap.
      restoreRun: async (useCaseId) => {
        // A run streaming into this tab is always the freshest truth.
        if (get().runs[useCaseId]?.running) return;

        let replay;
        try {
          replay = await api.getPipelineEvents(useCaseId);
        } catch {
          // 404 just means this use case has never run the pipeline — the
          // empty view is already the correct thing to show.
          return;
        }

        const known = Object.keys(get().runs[useCaseId]?.events ?? {}).length;
        restoreStalls[useCaseId] = replay.events.length > known ? 0 : (restoreStalls[useCaseId] ?? 0) + 1;

        if (replay.events.length) {
          set((state) => {
            const current = state.runs[useCaseId];
            if (current?.running) return state;
            // Only overwrite when the server knows more than this tab does,
            // so re-checks during a poll stay idempotent.
            if (Object.keys(current?.events ?? {}).length >= replay.events.length) return state;
            return {
              runs: {
                ...state.runs,
                [useCaseId]: {
                  events: Object.fromEntries(replay.events.map((event) => [event.stage, event])),
                  selectedStage: current?.selectedStage ?? replay.events[replay.events.length - 1].stage,
                  running: false,
                  completedAt: current?.completedAt ?? null,
                },
              },
            };
          });
        }

        // A run still streaming into another tab keeps producing stages that
        // this one can only see by asking again. Stop once it stops advancing,
        // so an abandoned run doesn't leave a timer running forever.
        clearTimeout(restorePolls[useCaseId]);
        delete restorePolls[useCaseId];
        const stalled = restoreStalls[useCaseId] >= RESTORE_STALL_LIMIT;
        if (replay.status === "running" && !stalled && !get().runs[useCaseId]?.running) {
          restorePolls[useCaseId] = setTimeout(() => {
            void get().restoreRun(useCaseId);
          }, RESTORE_POLL_MS);
        }
      },

      stopRestorePolling: (useCaseId) => {
        clearTimeout(restorePolls[useCaseId]);
        delete restorePolls[useCaseId];
        delete restoreStalls[useCaseId];
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
