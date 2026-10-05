import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary-container text-on-primary-container hover:brightness-110 shadow-soft",
        outline:
          "border border-outline-variant bg-surface text-on-surface hover:bg-surface-variant/40",
        "outline-gold":
          "border border-primary/40 text-primary-dark dark:text-primary hover:bg-primary/10 hover:border-primary/60",
        ghost: "text-on-surface hover:bg-surface-variant/40",
        inverse:
          "bg-inverse-surface text-inverse-on-surface hover:bg-inverse-surface/90",
        danger:
          "bg-status-danger text-white hover:brightness-110 shadow-soft",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3 text-xs rounded-lg",
        lg: "h-13 px-8 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
