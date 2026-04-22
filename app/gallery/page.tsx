"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Images, Sparkles } from "lucide-react";
import ResultGrid from "@/components/ResultGrid";
import Spinner from "@/components/ui/Spinner";
import { deleteEntry, listHistory } from "@/lib/storage";
import { useToast } from "@/components/ui/Toast";
import { describeError } from "@/lib/logger";
import type { HistoryEntry } from "@/lib/types";

export default function GalleryPage() {
  const router = useRouter();
  const { push } = useToast();
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    listHistory()
      .then(setEntries)
      .catch((err) => {
        push(`加载历史失败：${describeError(err)}`, "error");
        setEntries([]);
      });
  }, [push]);

  async function handleDelete(id: string) {
    try {
      await deleteEntry(id);
      setEntries((list) => (list ? list.filter((e) => e.id !== id) : list));
    } catch (err) {
      push(`删除失败：${describeError(err)}`, "error");
    }
  }

  function sendToEdit(dataUrl: string) {
    sessionStorage.setItem("edit:seed", dataUrl);
    router.push("/edit");
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 md:py-12">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Images className="h-5 w-5 text-[var(--color-brand)]" />
          <h1 className="font-[family-name:var(--font-serif)] text-2xl">Gallery</h1>
          {entries && (
            <span className="ml-1 text-sm text-[var(--color-ink-mute)]">
              {entries.length} 条记录
            </span>
          )}
        </div>
      </header>

      {!entries && (
        <div className="flex items-center justify-center py-16 text-[var(--color-ink-mute)]">
          <Spinner className="mr-2 h-4 w-4" /> 加载中⋯⋯
        </div>
      )}

      {entries && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-strong)] bg-white/40 py-16 text-center text-[var(--color-ink-soft)]">
          <Images className="h-8 w-8 text-[var(--color-ink-mute)]" />
          <p className="text-sm">还没有生成过任何图片</p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-ink)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--color-ink-soft)]"
          >
            <Sparkles className="h-4 w-4" /> 去生成第一张
          </Link>
        </div>
      )}

      {entries && entries.length > 0 && (
        <ResultGrid entries={entries} onEditImage={sendToEdit} onDelete={handleDelete} />
      )}
    </div>
  );
}
