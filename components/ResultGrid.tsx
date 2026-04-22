"use client";

import { Download, Wand2, X } from "lucide-react";
import type { HistoryEntry } from "@/lib/types";
import { downloadImage, fetchAsDataUrl, imageUrl } from "@/lib/storage";
import { createLogger, describeError } from "@/lib/logger";
import Button from "./ui/Button";
import { useToast } from "./ui/Toast";

const log = createLogger("result-grid");

interface Props {
  entries: HistoryEntry[];
  onEditImage?: (dataUrl: string) => void;
  onDelete?: (id: string) => void;
}

function guessExt(filename: string): string {
  const p = filename.toLowerCase().split(".").pop();
  return p === "jpeg" ? "jpg" : p || "png";
}

function EntryCard({
  entry,
  onEditImage,
  onDelete,
}: {
  entry: HistoryEntry;
  onEditImage?: (dataUrl: string) => void;
  onDelete?: (id: string) => void;
}) {
  const { push } = useToast();

  function handleDownload(filename: string, idx: number) {
    const stem =
      entry.prompt.slice(0, 30).replace(/[^\w\u4e00-\u9fa5]+/g, "_") || "image";
    downloadImage(filename, `${stem}_${idx + 1}.${guessExt(filename)}`);
  }

  async function handleReuse(filename: string) {
    try {
      const dataUrl = await fetchAsDataUrl(filename);
      onEditImage?.(dataUrl);
    } catch (err) {
      log.error("再编辑 获取图片失败", err);
      push(`无法读取图片：${describeError(err)}`, "error");
    }
  }

  return (
    <div className="animate-fade-in-up rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm text-[var(--color-ink)]">{entry.prompt}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--color-ink-mute)]">
            <span>{entry.model}</span>
            {entry.size && <span>· {entry.size}</span>}
            {entry.quality && <span>· {entry.quality}</span>}
            <span>· {entry.imageBlobKeys.length} 张</span>
          </div>
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(entry.id)}
            className="rounded-lg p-1.5 text-[var(--color-ink-mute)] hover:bg-black/5 hover:text-[var(--color-danger)]"
            title="删除"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div
        className={
          entry.imageBlobKeys.length === 1
            ? "grid grid-cols-1"
            : entry.imageBlobKeys.length === 2
              ? "grid grid-cols-2 gap-2"
              : "grid grid-cols-2 gap-2 md:grid-cols-3"
        }
      >
        {entry.imageBlobKeys.map((key, i) => (
          <div
            key={key}
            className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(key)}
              alt={`result ${i + 1}`}
              className="block h-auto w-full object-cover"
              onError={() => {
                log.warn("<img> 加载失败", key);
              }}
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/55 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
              {onEditImage && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleReuse(key)}
                  className="bg-white/90"
                >
                  <Wand2 className="h-3.5 w-3.5" /> 再编辑
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleDownload(key, i)}
                className="bg-white/90"
              >
                <Download className="h-3.5 w-3.5" /> 下载
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResultGrid({ entries, onEditImage, onDelete }: Props) {
  if (!entries.length) return null;
  return (
    <div className="flex flex-col gap-4">
      {entries.map((e) => (
        <EntryCard
          key={e.id}
          entry={e}
          onEditImage={onEditImage}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
