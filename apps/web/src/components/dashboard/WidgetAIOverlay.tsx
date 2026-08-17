import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Send, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { WidgetCommandPreview } from "./WidgetCommandPreview";
import { interpretWidgetCommand, type ChatMessage } from "@/lib/widgetAiService";
import { parseWidgetCommand } from "@/lib/widgetSchema";
import { validateWidgetChanges } from "@/lib/widgetValidation";
import { WIDGET_CAPABILITIES, type WidgetChanges, type WidgetContext } from "@/lib/widgetTypes";

interface DisplayMessage extends ChatMessage {
  id: string;
}

interface PendingChange {
  changes: WidgetChanges;
  explanation: string;
  isReset: boolean;
}

/** The AI assistant is a visualization-configuration assistant only: it can
 * produce a WidgetChanges object for THIS widget (see `context`), nothing
 * else. It never touches other widgets, the DOM, chart internals, or app
 * settings — see widgetAiService.ts / widgetValidation.ts for the layer
 * that enforces this. */
export function WidgetAIOverlay({
  context,
  canUndo,
  onClose,
  onApply,
  onReset,
  onUndo,
}: {
  context: WidgetContext;
  canUndo: boolean;
  onClose: () => void;
  /** `changes` is always a delta to merge onto the widget's current config — never the whole config. */
  onApply: (changes: WidgetChanges) => Promise<void>;
  /** Resets the widget to its default configuration (not a merge). */
  onReset: () => Promise<void>;
  onUndo: () => Promise<void>;
}) {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    { id: "welcome", role: "assistant", content: `What would you like to change about "${context.widgetTitle}"?` },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [applying, setApplying] = useState(false);
  const idRef = useRef(0);

  function pushMessage(role: ChatMessage["role"], content: string) {
    idRef.current += 1;
    setMessages((prev) => [...prev, { id: `m${idRef.current}`, role, content }]);
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    pushMessage("user", text);

    const history: ChatMessage[] = messages.map(({ role, content }) => ({ role, content }));
    const result = interpretWidgetCommand(text, context, history);

    if (result.type === "clarify") {
      pushMessage("assistant", result.options?.length ? `${result.message} (${result.options.join(", ")})` : result.message);
      return;
    }
    if (result.type === "unrecognized") {
      pushMessage("assistant", result.message);
      return;
    }

    // Structured command produced — validate before ever touching state.
    const parsed = parseWidgetCommand(result.command);
    if (!parsed.success) {
      pushMessage("assistant", "That request didn't produce a valid configuration — try rephrasing it.");
      return;
    }

    if (result.command.action === "reset_widget") {
      pushMessage("assistant", result.explanation);
      if (result.requiresConfirmation) {
        setPending({ changes: {}, explanation: result.explanation, isReset: true });
      } else {
        void runReset();
      }
      return;
    }

    const capability = WIDGET_CAPABILITIES[context.widgetId];
    const changes = result.command.changes ?? {};
    const validation = validateWidgetChanges(changes, capability);
    if (!validation.valid) {
      const fields = validation.availableFields ? ` Available fields: ${validation.availableFields.join(", ")}.` : "";
      const types = validation.availableChartTypes ? ` Supported here: ${validation.availableChartTypes.join(", ")}.` : "";
      pushMessage("assistant", `${validation.reason}${fields}${types}`);
      return;
    }

    if (result.requiresConfirmation) {
      pushMessage("assistant", result.explanation);
      setPending({ changes, explanation: result.explanation, isReset: false });
    } else {
      pushMessage("assistant", result.explanation);
      void applyChanges(changes);
    }
  }

  async function applyChanges(changes: WidgetChanges) {
    setApplying(true);
    try {
      await onApply(changes);
      pushMessage("assistant", "Done.");
    } catch {
      pushMessage("assistant", "Something went wrong applying that change — nothing was saved.");
    } finally {
      setApplying(false);
      setPending(null);
    }
  }

  async function runReset() {
    setApplying(true);
    try {
      await onReset();
      pushMessage("assistant", "Done — back to defaults.");
    } catch {
      pushMessage("assistant", "Something went wrong resetting this widget.");
    } finally {
      setApplying(false);
      setPending(null);
    }
  }

  async function handleUndo() {
    setApplying(true);
    try {
      await onUndo();
      pushMessage("assistant", "Reverted to the previous version.");
    } catch {
      pushMessage("assistant", "Nothing to undo.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      role="dialog"
      aria-label={`AI assistant for ${context.widgetTitle}`}
      className="absolute right-0 top-full z-30 mt-2 flex w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-border bg-background-elevated shadow-2xl sm:w-96"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div>
          <p className="text-xs font-semibold text-foreground">AI Assistant</p>
          <p className="truncate text-[11px] text-foreground-subtle">{context.widgetTitle}</p>
        </div>
        <div className="flex items-center gap-1">
          {canUndo && (
            <button
              onClick={() => void handleUndo()}
              disabled={applying}
              aria-label="Undo last change"
              title="Undo last change"
              className="flex size-6 items-center justify-center rounded-md text-foreground-muted hover:bg-surface hover:text-foreground disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close AI assistant"
            className="flex size-6 items-center justify-center rounded-md text-foreground-muted hover:bg-surface hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="flex max-h-64 flex-col gap-2 overflow-y-auto p-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-lg bg-primary px-2.5 py-1.5 text-xs text-primary-foreground"
                : "mr-auto max-w-[90%] rounded-lg bg-surface px-2.5 py-1.5 text-xs text-foreground-muted"
            }
          >
            {m.content}
          </div>
        ))}
        {pending && (
          <WidgetCommandPreview
            explanation={pending.explanation}
            changes={pending.changes}
            applying={applying}
            onApply={() => void (pending.isReset ? runReset() : applyChanges(pending.changes))}
            onCancel={() => {
              setPending(null);
              pushMessage("assistant", "Cancelled — no changes made.");
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-1.5 border-t border-border p-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Ask AI..."
          aria-label="AI instruction"
          className="h-8 text-xs"
        />
        <Button size="icon" className="size-8 shrink-0" onClick={handleSend} aria-label="Send">
          <Send className="size-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
