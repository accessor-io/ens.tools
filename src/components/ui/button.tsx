import * as React from "react";
import { Slot } from "@radix-ui/react-slot@1.1.2";
import { cva, type VariantProps } from "class-variance-authority@0.7.1";

import { cn } from './utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-base font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive", /* Increased by ~10% */
  {
    variants: {
      variant: {
        default: "!bg-gradient-to-r !from-violet-600 !to-purple-600 !text-white hover:!from-violet-700 hover:!to-purple-700 !shadow-lg !shadow-violet-500/50 depth-1 hover:depth-2 active:depth-inner transition-all",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 depth-1 hover:depth-2 active:depth-inner",
        outline:
          "border border-violet-200 bg-white text-slate-700 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 dark:bg-input/30 dark:border-input dark:hover:bg-input/50 depth-1 hover:depth-2 active:depth-inner",
        secondary:
          "bg-gradient-to-r from-indigo-100 to-violet-100 text-indigo-700 hover:from-indigo-200 hover:to-violet-200 depth-1 hover:depth-2 active:depth-inner",
        ghost:
          "hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-accent/50",
        link: "text-violet-600 underline-offset-4 hover:underline hover:text-violet-700",
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-4", /* Increased by ~10% */
        sm: "h-9 rounded-md gap-2 px-4 has-[>svg]:px-3", /* Increased by ~10% */
        lg: "h-11 rounded-md px-7 has-[>svg]:px-5", /* Increased by ~10% */
        icon: "size-10 rounded-md", /* Increased by ~10% */
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };
