"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn, fileToDataUrl } from "@/lib/utils";

interface Props {
  images: string[];
  onChange: (list: string[]) => void;
  max?: number;
}

export default function ImageDropzone({ images, onChange, max = 16 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const accepted: File[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        accepted.push(f);
      }
      if (!accepted.length) return;
      const urls = await Promise.all(accepted.map(fileToDataUrl));
      const next = [...images, ...urls].slice(0, max);
      onChange(next);
    },
    [images, onChange, max],
  );

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer?.files?.length) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed bg-[var(--color-bg-alt)]/40 px-5 py-10 text-center text-sm transition-colors cursor-pointer",
          dragging
            ? "border-[var(--color-brand)] bg-[var(--color-brand)]/5"
            : "border-[var(--color-border-strong)] hover:border-[var(--color-ink)]",
        )}
      >
        <ImagePlus className="h-6 w-6 text-[var(--color-ink-mute)]" />
        <p className="text-[var(--color-ink-soft)]">
          拖放图片到这里，或<span className="text-[var(--color-ink)] underline underline-offset-4"> 点击选择</span>
        </p>
        <p className="text-xs text-[var(--color-ink-mute)]">
          支持 PNG / JPG / WEBP，最多 {max} 张
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
          {images.map((url, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`input ${i}`}
                className="block aspect-square w-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(images.filter((_, idx) => idx !== i));
                }}
                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
