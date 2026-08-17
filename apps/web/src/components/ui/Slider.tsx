import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function Slider({ value, onValueChange, min = -50, max = 50, step = 1, className }: SliderProps) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-5 w-full touch-none select-none items-center", className)}
      value={[value]}
      onValueChange={(v) => onValueChange(v[0])}
      min={min}
      max={max}
      step={step}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface">
        <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-primary to-accent" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-lg transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
    </SliderPrimitive.Root>
  );
}
