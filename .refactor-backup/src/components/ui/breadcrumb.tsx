import * as React from "react";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "./utils";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-2 text-sm", className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isClickable = item.onClick && !item.disabled && !isLast;

        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
            <div
              className={cn(
                "flex items-center",
                isClickable && "cursor-pointer hover:text-violet-600",
                isLast && "text-slate-900 font-medium",
                !isLast && !isClickable && "text-slate-500",
                item.disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={isClickable ? item.onClick : undefined}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={
                isClickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        item.onClick?.();
                      }
                    }
                  : undefined
              }
            >
              {index === 0 && (
                <Home className="h-4 w-4 mr-1" />
              )}
              <span>{item.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
