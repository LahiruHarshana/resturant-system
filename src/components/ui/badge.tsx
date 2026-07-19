import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary/50 bg-primary/10 text-primary shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:bg-primary/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]",
        secondary:
          "border-secondary/50 bg-secondary/10 text-secondary-foreground hover:bg-secondary/20",
        destructive:
          "border-danger/50 bg-danger/10 text-danger shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:bg-danger/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]",
        success:
          "border-success/50 bg-success/10 text-success shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:bg-success/20",
        warning:
          "border-warning/50 bg-warning/10 text-warning shadow-[0_0_10px_rgba(245,158,11,0.2)] hover:bg-warning/20",
        info: "border-info/50 bg-info/10 text-info shadow-[0_0_10px_rgba(14,165,233,0.2)] hover:bg-info/20",
        outline: "text-foreground border-border/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
