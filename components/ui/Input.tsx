"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-9 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm transition-colors placeholder:text-[var(--color-ink-mute)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-ink)] focus:outline-none",
          className,
        )}
        {...rest}
      />
    );
  },
);

export default Input;
