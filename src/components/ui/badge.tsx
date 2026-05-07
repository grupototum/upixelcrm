/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground",
        secondary:   "bg-[#ffd814] text-[#0f1111]",
        destructive: "bg-destructive text-destructive-foreground",
        success:     "bg-[var(--badge-bg)] text-[var(--badge-fg)]",
        outline:     "border border-border text-foreground bg-transparent",
        warm:        "bg-[#cc0c39] text-white",
        prime:       "bg-[#00a8e0] text-white",
        deal:        "bg-[#cc0c39] text-white",
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
