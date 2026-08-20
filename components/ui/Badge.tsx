import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-mono transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-zinc-800 bg-zinc-900 text-zinc-300",
        secondary:
          "border-zinc-800/60 bg-zinc-950 text-zinc-400",
        active:
          "border-emerald-900/60 bg-emerald-950/40 text-emerald-400",
        destructive:
          "border-red-900/60 bg-red-950/40 text-red-400",
        outline:
          "border-zinc-800 text-zinc-400 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
