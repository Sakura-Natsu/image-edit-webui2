"use client";

import { useEffect } from "react";
import type {
  Background,
  Dalle3Style,
  ImageQuality,
  ImageSize,
  InputFidelity,
  ModelCapability,
  OutputFormat,
} from "@/lib/types";
import { BACKGROUND_OPTIONS, OUTPUT_FORMAT_OPTIONS } from "@/lib/model-config";
import Select from "./ui/Select";
import Slider from "./ui/Slider";

export interface ParameterState {
  size: ImageSize;
  quality: ImageQuality;
  n: number;
  background: Background;
  output_format: OutputFormat;
  output_compression: number;
  style: Dalle3Style;
  input_fidelity: InputFidelity;
}

export function defaultsForCaps(caps: ModelCapability): ParameterState {
  return {
    size: caps.defaultSize,
    quality: caps.defaultQuality,
    n: 1,
    background: "auto",
    output_format: "png",
    output_compression: 80,
    style: "vivid",
    input_fidelity: "low",
  };
}

interface Props {
  caps: ModelCapability;
  mode: "generate" | "edit";
  value: ParameterState;
  onChange: (patch: Partial<ParameterState>) => void;
}

export default function ParameterPanel({ caps, mode, value, onChange }: Props) {
  useEffect(() => {
    const patch: Partial<ParameterState> = {};
    if (!caps.sizes.includes(value.size)) patch.size = caps.defaultSize;
    if (!caps.qualities.includes(value.quality)) patch.quality = caps.defaultQuality;
    if (value.n > caps.maxN) patch.n = caps.maxN;
    if (Object.keys(patch).length) onChange(patch);
  }, [caps, value.size, value.quality, value.n, onChange]);

  return (
    <div className="flex flex-col gap-5 text-sm">
      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-mute)]">
          尺寸与质量
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--color-ink-soft)]">Size</label>
            <Select
              value={value.size}
              onChange={(e) => onChange({ size: e.target.value })}
            >
              {caps.sizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--color-ink-soft)]">Quality</label>
            <Select
              value={value.quality}
              onChange={(e) => onChange({ quality: e.target.value })}
            >
              {caps.qualities.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {caps.maxN > 1 && (
          <Slider
            label="生成数量 (n)"
            value={Math.min(value.n, caps.maxN)}
            min={1}
            max={caps.maxN}
            onChange={(v) => onChange({ n: v })}
          />
        )}
      </section>

      {(caps.supportsBackground ||
        caps.supportsOutputFormat ||
        caps.supportsStyle ||
        (mode === "edit" && caps.supportsInputFidelity)) && (
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-mute)]">
            高级参数
          </h3>

          {caps.supportsBackground && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--color-ink-soft)]">Background</label>
              <Select
                value={value.background}
                onChange={(e) =>
                  onChange({ background: e.target.value as Background })
                }
              >
                {BACKGROUND_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {caps.supportsOutputFormat && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-ink-soft)]">
                  Output Format
                </label>
                <Select
                  value={value.output_format}
                  onChange={(e) =>
                    onChange({ output_format: e.target.value as OutputFormat })
                  }
                >
                  {OUTPUT_FORMAT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </Select>
              </div>
              {value.output_format !== "png" && (
                <Slider
                  label="Compression"
                  value={value.output_compression}
                  min={0}
                  max={100}
                  onChange={(v) => onChange({ output_compression: v })}
                  suffix="%"
                />
              )}
            </div>
          )}

          {caps.supportsStyle && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--color-ink-soft)]">Style</label>
              <Select
                value={value.style}
                onChange={(e) => onChange({ style: e.target.value as Dalle3Style })}
              >
                <option value="vivid">vivid</option>
                <option value="natural">natural</option>
              </Select>
            </div>
          )}

          {mode === "edit" && caps.supportsInputFidelity && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--color-ink-soft)]">
                Input Fidelity
              </label>
              <Select
                value={value.input_fidelity}
                onChange={(e) =>
                  onChange({ input_fidelity: e.target.value as InputFidelity })
                }
              >
                <option value="low">low</option>
                <option value="high">high</option>
              </Select>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
