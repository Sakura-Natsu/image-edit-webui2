"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Copy, Info, X } from "lucide-react";

export type ToastKind = "info" | "success" | "error";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface Ctx {
  push: (message: string, kind?: ToastKind) => void;
}

const ToastCtx = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const AUTO_DISMISS_MS: Record<ToastKind, number> = {
  success: 3000,
  info: 4500,
  error: 0, // 0 = 不自动消失，用户必须手动关闭
};

const ICONS: Record<ToastKind, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  info: Info,
  error: AlertCircle,
};

const KIND_CLASS: Record<ToastKind, string> = {
  success: "border-emerald-300/80 bg-white text-emerald-700",
  info: "border-[var(--color-border)] bg-white text-[var(--color-ink)]",
  error: "border-[var(--color-danger)]/40 bg-white text-[var(--color-danger)]",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((list) => list.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = ++seq.current;
      setItems((list) => [...list, { id, kind, message }]);
      const ttl = AUTO_DISMISS_MS[kind];
      if (ttl > 0) {
        setTimeout(() => remove(id), ttl);
      }
    },
    [remove],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-5 bottom-5 z-50 flex w-[22rem] flex-col gap-2">
        {items.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div
              key={t.id}
              className={[
                "pointer-events-auto animate-fade-in-up rounded-xl border px-3 py-2.5 text-sm shadow-md backdrop-blur",
                KIND_CLASS[t.kind],
              ].join(" ")}
              role={t.kind === "error" ? "alert" : "status"}
            >
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1 break-words whitespace-pre-wrap select-text">
                  {t.message}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {t.kind === "error" && (
                    <button
                      onClick={() => {
                        try {
                          navigator.clipboard?.writeText(t.message);
                        } catch {
                          /* noop */
                        }
                      }}
                      title="复制错误"
                      className="rounded p-1 text-current/80 hover:bg-black/5"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => remove(t.id)}
                    title="关闭"
                    className="rounded p-1 text-current/80 hover:bg-black/5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
