import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-surface-variant text-on-surface-variant",
        gold: "bg-primary-container text-on-primary-container shadow-2xs",
        "gold-subtle": "bg-primary/10 text-primary-dark dark:text-primary border border-primary/20",
        success: "bg-status-success text-on-status-success",
        "success-subtle": "bg-status-success/10 text-status-success border border-status-success/20",
        warning: "bg-status-warning text-on-status-warning",
        "warning-subtle": "bg-status-warning/10 text-status-warning border border-status-warning/20",
        danger: "bg-status-danger text-on-status-danger",
        "danger-subtle": "bg-status-danger/10 text-status-danger border border-status-danger/20",
        inverse: "bg-inverse-surface text-inverse-on-surface",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
