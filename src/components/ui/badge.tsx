import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from './utils';

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3.5 gap-1.5 [&>svg]:pointer-events-none transition-all overflow-hidden leading-tight backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "border-purple-500/30 bg-purple-500/20 text-purple-300 shadow-glow-purple",
        secondary: "border-white/10 bg-white/5 text-secondary",
        destructive: "border-red-500/30 bg-red-500/20 text-red-300",
        outline: "border-white/20 text-white/80",
        success: "border-emerald-500/30 bg-emerald-500/20 text-emerald-300",
        warning: "border-amber-500/30 bg-amber-500/20 text-amber-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
