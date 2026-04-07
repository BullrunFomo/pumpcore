import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-blue-500 text-white",
        secondary: "border-transparent bg-zinc-700 text-zinc-200",
        destructive: "border-transparent bg-red-600 text-white",
        outline: "border-zinc-600 text-zinc-300",
        success: "border-transparent bg-green-700 text-white",
        warning: "border-transparent bg-yellow-600 text-white",
        mayhem: "border-transparent bg-red-600/80 text-white",
        cashback: "border-transparent bg-green-600/80 text-white",
        agent: "border-transparent bg-blue-500/80 text-white",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
