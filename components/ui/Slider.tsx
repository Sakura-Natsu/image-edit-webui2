"use client";

import type { ChangeEvent } from "react";

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label?: string;
  suffix?: string;
}

export default function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  suffix,
}: Props) {
  const handle = (e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value));
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center justify-between text-xs text-[var(--color-ink-soft)]">
          <span>{label}</span>
          <span className="font-mono text-[var(--color-ink)]">
            {value}
            {suffix ?? ""}
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handle}
        className="slider-range h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-border)] accent-[var(--color-ink)]"
      />
    </div>
  );
}
