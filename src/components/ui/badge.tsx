/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground",
        secondary:   "bg-accent text-accent-foreground border border-[hsl(var(--border-strong))]",
        destructive: "bg-destructive text-destructive-foreground",
        success:     "bg-success/15 text-success",
        outline:     "border border-[hsl(var(--border-strong))] text-foreground bg-transparent",
        warm:        "bg-[var(--badge-bg)] text-[var(--badge-fg)]",
        orange:      "bg-[#ff4f00]/10 text-[#ff4f00] border border-[#ff4f00]/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  children?: React.ReactNode;
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
