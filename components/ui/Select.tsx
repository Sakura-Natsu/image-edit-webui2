"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  compact?: boolean;
}

const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { className, compact, children, ...rest },
  ref,
) {
  return (
    <div className="relative inline-flex items-center">
      <select
        ref={ref}
        className={cn(
          "appearance-none rounded-xl border border-[var(--color-border)] bg-white pr-7 text-[var(--color-ink)] transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-ink)] focus:outline-none",
          compact ? "h-8 pl-2.5 text-xs" : "h-9 pl-3 text-sm",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-[var(--color-ink-mute)]" />
    </div>
  );
});

export default Select;
