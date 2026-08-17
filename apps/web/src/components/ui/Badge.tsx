import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-surface text-foreground-muted border border-border",
      primary: "bg-primary/15 text-primary border border-primary/30",
      success: "bg-success/15 text-success border border-success/30",
      warning: "bg-warning/15 text-warning border border-warning/30",
      danger: "bg-danger/15 text-danger border border-danger/30",
      accent: "bg-accent/15 text-accent border border-accent/30",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function riskVariant(risk: string): BadgeProps["variant"] {
  if (risk === "Low") return "success";
  if (risk === "Medium") return "warning";
  return "danger";
}
