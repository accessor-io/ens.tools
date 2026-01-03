import * as React from "react";

import { cn } from './utils';

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "input-enhanced file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-10 w-full min-w-0 rounded-lg border px-4 py-2 text-base bg-input-background transition-all duration-250 outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-base file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-base",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "focus-ring",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
