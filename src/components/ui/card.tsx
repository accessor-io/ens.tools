import * as React from "react";

import { cn } from './utils';

const CardDepthContext = React.createContext<number>(0);

function Card({ className, children, ...props }: React.ComponentProps<"div">) {
  const depth = React.useContext(CardDepthContext);
  
  const depthClasses = [
    "bg-white",
    "bg-slate-50",
    "bg-slate-100",
    "bg-slate-200",
    "bg-slate-300",
  ];
  
  const backgroundClass = depthClasses[Math.min(depth, depthClasses.length - 1)] || depthClasses[depthClasses.length - 1];
  
  return (
    <CardDepthContext.Provider value={depth + 1}>
      <div
        data-slot="card"
        className={cn(
          backgroundClass,
          "text-card-foreground flex flex-col gap-6 rounded-xl border border-slate-200/40",
          "depth-elevated transition-shadow duration-200 hover:shadow-lg hover:shadow-violet-200/30",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </CardDepthContext.Provider>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <h4
      data-slot="card-title"
      className={cn("leading-none", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 [&:last-child]:pb-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
