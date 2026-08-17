import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: TabsPrimitive.TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn("inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: TabsPrimitive.TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium text-foreground-muted transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:text-foreground",
        className
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
