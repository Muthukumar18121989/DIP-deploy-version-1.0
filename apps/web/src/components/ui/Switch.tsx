import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: SwitchPrimitive.SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full bg-surface border border-border transition-colors data-[state=checked]:bg-primary data-[state=checked]:border-primary",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-1 rounded-full bg-foreground transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-white" />
    </SwitchPrimitive.Root>
  );
}
