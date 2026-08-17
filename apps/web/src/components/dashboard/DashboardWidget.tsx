import type { ReactNode } from "react";
import { Move, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/** Wraps one dashboard chart in a hover-revealed control area (top-right:
 * Move + AI) without touching the chart content itself. Reordering uses
 * native HTML5 drag-and-drop on the Move handle only — dragging the card
 * body would fight with chart tooltips/interactions, so only the small
 * handle icon is draggable. No absolute-positioned layout is used for the
 * grid itself; this only repositions items within the existing CSS grid by
 * changing DOM/array order. */
export function DashboardWidget({
  widgetId,
  title,
  isDragging,
  isDropTarget,
  aiActive,
  className,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onAiToggle,
  children,
}: {
  widgetId: string;
  title: string;
  isDragging: boolean;
  isDropTarget: boolean;
  aiActive: boolean;
  className?: string;
  onDragStart: (widgetId: string) => void;
  onDragOver: (widgetId: string) => void;
  onDrop: (widgetId: string) => void;
  onDragEnd: () => void;
  onAiToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "group relative transition-opacity",
        isDragging && "opacity-40",
        isDropTarget && "ring-2 ring-primary",
        // The AI overlay (WidgetAIOverlay, z-30) is a child of this Card and
        // overflows below it. CSS grid items paint in an implicit stacking
        // order — a z-30 descendant doesn't outrank a *later* grid-item
        // sibling unless the containing grid item itself is also elevated,
        // so without this the overlay was getting covered by the widget
        // below it. Elevating only the active widget keeps this a no-op for
        // every other widget's stacking.
        aiActive && "z-40",
        className
      )}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(widgetId);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(widgetId);
      }}
      data-widget-id={widgetId}
    >
      <div className="absolute right-3 top-3 z-10 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            onDragStart(widgetId);
          }}
          onDragEnd={onDragEnd}
          aria-label={`Move ${title} widget`}
          title="Move"
          className="flex size-7 cursor-grab items-center justify-center rounded-md border border-border bg-surface text-foreground-muted hover:text-foreground active:cursor-grabbing"
        >
          <Move className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onAiToggle}
          aria-label={`Ask AI about ${title} widget`}
          aria-pressed={aiActive}
          title="AI"
          className={cn(
            "flex size-7 items-center justify-center rounded-md border text-foreground-muted hover:text-foreground",
            aiActive ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface"
          )}
        >
          <Sparkles className="size-3.5" />
        </button>
      </div>
      {children}
    </Card>
  );
}
