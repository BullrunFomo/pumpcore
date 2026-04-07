import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 tracking-wide",
  {
    variants: {
      variant: {
        // Neon-bordered ghost style — matches the screenshot
        default:
          "bg-transparent border border-[#4f83ff] text-[#4f83ff] shadow-[0_0_8px_rgba(79,131,255,0.35),inset_0_0_8px_rgba(79,131,255,0.06)] hover:bg-[#4f83ff]/10 hover:shadow-[0_0_14px_rgba(79,131,255,0.5),inset_0_0_10px_rgba(79,131,255,0.08)]",
        destructive:
          "bg-transparent border border-red-500 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3)] hover:bg-red-500/10 hover:shadow-[0_0_14px_rgba(239,68,68,0.45)]",
        outline:
          "border border-zinc-700 bg-transparent text-zinc-300 hover:border-zinc-500 hover:text-zinc-100",
        secondary:
          "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
        ghost: "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100",
        link: "text-[#4f83ff] underline-offset-4 hover:underline",
        success:
          "bg-transparent border border-green-500 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.3)] hover:bg-green-500/10 hover:shadow-[0_0_14px_rgba(34,197,94,0.4)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-8 text-base",
        xl: "h-14 px-10 text-lg font-semibold",
        icon: "h-9 w-9",
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
