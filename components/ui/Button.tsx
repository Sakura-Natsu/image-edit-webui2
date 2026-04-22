"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-[var(--color-ink)] text-white hover:bg-[var(--color-ink-soft)] disabled:bg-[var(--color-ink-mute)] disabled:text-white/80",
  secondary:
    "bg-white text-[var(--color-ink)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-alt)]",
  ghost:
    "bg-transparent text-[var(--color-ink-soft)] hover:bg-black/5 hover:text-[var(--color-ink)]",
  danger:
    "bg-[var(--color-danger)] text-white hover:opacity-90 disabled:bg-[var(--color-ink-mute)]",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-lg",
  md: "h-9 px-4 text-sm rounded-xl",
  lg: "h-11 px-5 text-sm rounded-xl",
  icon: "h-9 w-9 rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "secondary", size = "md", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    />
  );
});

export default Button;
