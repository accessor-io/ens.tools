import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from './utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-250 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-pink-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  {
    variants: {
      variant: {
        default: "bg-pink-500 text-white hover:bg-pink-600 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 shadow-sm",
        destructive: "bg-red-500 text-white hover:bg-red-600 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md",
        secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md",
        ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        link: "text-pink-500 underline-offset-4 hover:underline hover:text-pink-600",
        gradient: "btn-gradient text-white hover:-translate-y-0.5 active:translate-y-0",
        glass: "btn-glass text-white hover:shadow-lg",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md gap-1.5 px-3 text-xs",
        lg: "h-10 rounded-lg px-5",
        icon: "size-9 rounded-lg",
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
