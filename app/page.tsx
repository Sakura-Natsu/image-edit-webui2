"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ImagePlus, Settings2, Sparkles } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Spinner from "@/components/ui/Spinner";
import ParameterPanel, {
  type ParameterState,
  defaultsForCaps,
} from "@/components/ParameterPanel";
import ResultGrid from "@/components/ResultGrid";
import { useToast } from "@/components/ui/Toast";
import { callGenerate } from "@/lib/openai-client";
import {
  BUILTIN_MODELS,
  BUILTIN_MODEL_CAPS,
  listAllModels,
  resolveModelCaps,
} from "@/lib/model-config";
import { saveEntry } from "@/lib/storage";
import { loadSettings } from "@/lib/settings";
import { createLogger, describeError } from "@/lib/logger";
import type {
  CustomModel,
  GenerateParams,
  HistoryEntry,
  ImageModel,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const log = createLogger("generate-page");

const PRESETS: { label: string; appendTo: string }[] = [
  { label: "写实摄影", appendTo: "，高细节，写实风格，专业摄影，自然光线" },
  { label: "插画", appendTo: "，扁平插画风格，柔和色彩" },
  { label: "3D 渲染", appendTo: "，8K 3D 渲染，Octane，电影级光照" },
  { label: "线稿", appendTo: "，黑白线稿，干净简洁" },
  { label: "水彩", appendTo: "，水彩画风格，柔和过渡" },
];

export default function HomePage() {
  const router = useRouter();
  const { push } = useToast();
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [model, setModel] = useState<ImageModel>("gpt-image-1-mini");
  const [prompt, setPrompt] = useState("");
  const [params, setParams] = useState<ParameterState>(() =>
    defaultsForCaps(BUILTIN_MODEL_CAPS["gpt-image-1-mini"]),
  );
  const [loading, setLoading] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const [results, setResults] = useState<HistoryEntry[]>([]);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCustomModels(loadSettings().customModels);
  }, []);

  const caps = useMemo(
    () => resolveModelCaps(model, customModels),
    [model, customModels],
  );

  const allModels = useMemo(() => listAllModels(customModels), [customModels]);

  useEffect(() => {
    setParams((p) => ({
      ...defaultsForCaps(caps),
      n: Math.min(p.n, caps.maxN) || 1,
    }));
  }, [caps]);

  function updateParam(patch: Partial<ParameterState>) {
    setParams((p) => ({ ...p, ...patch }));
  }

  function applyPreset(suffix: string) {
    const current = prompt.trim();
    if (!current) {
      setPrompt(suffix.replace(/^，/, ""));
    } else if (!current.includes(suffix.trim())) {
      setPrompt(`${current}${suffix}`);
    }
    promptRef.current?.focus();
  }

  async function generate() {
    const text = prompt.trim();
    if (!text) {
      push("请先输入提示词", "info");
      promptRef.current?.focus();
      return;
    }
    setLoading(true);
    const payload: GenerateParams = {
      model,
      prompt: text,
      n: params.n,
    };
    if (params.size) payload.size = params.size;
    if (params.quality) payload.quality = params.quality;
    if (caps.supportsBackground && params.background !== "auto")
      payload.background = params.background;
    if (caps.supportsOutputFormat) {
      payload.output_format = params.output_format;
      if (params.output_format !== "png") payload.output_compression = params.output_compression;
    }
    if (caps.supportsStyle) payload.style = params.style;

    try {
      const res = await callGenerate(payload);
      const fmt = payload.output_format ?? "png";
      const images = res.data
        .filter((d) => !!d.b64_json)
        .map((d) => ({ b64: d.b64_json!, format: fmt }));
      if (!images.length) {
        log.warn("响应 data 中无 b64_json", res);
        throw new Error("上游未返回 b64_json 图片（检查浏览器控制台查看原始响应）");
      }
      const entry = await saveEntry({
        kind: "generate",
        prompt: text,
        model,
        size: payload.size,
        quality: payload.quality,
        revisedPrompt: res.data.find((d) => d.revised_prompt)?.revised_prompt,
        params: payload,
        images,
      });
      setResults((list) => [entry, ...list]);
      push("生成完成", "success");
    } catch (err) {
      log.error("生成失败", err);
      push(`生成失败：${describeError(err)}`, "error");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      generate();
    }
  }

  function sendToEdit(dataUrl: string) {
    sessionStorage.setItem("edit:seed", dataUrl);
    router.push("/edit");
  }

  const hasCustom = customModels.length > 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12 md:py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <Sparkles className="h-7 w-7 text-[var(--color-brand)]" strokeWidth={2.2} />
        <h1 className="font-[family-name:var(--font-serif)] text-4xl md:text-5xl">
          Create an image
        </h1>
        <p className="text-sm text-[var(--color-ink-soft)]">
          用文字描述你想要的画面，选择模型与参数即可生成。
        </p>
      </header>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm transition-shadow focus-within:shadow-md">
        <textarea
          ref={promptRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder="一只坐在海边看日落的猫，柔和的光线⋯⋯"
          className="block w-full bg-transparent px-2 py-2 text-base leading-relaxed outline-none placeholder:text-[var(--color-ink-mute)]"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-2">
          <div className="flex items-center gap-1.5">
            <Link
              href="/edit"
              title="上传图片进行编辑"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-ink-mute)] hover:bg-black/5 hover:text-[var(--color-ink)]"
            >
              <ImagePlus className="h-[18px] w-[18px]" />
            </Link>
            <button
              onClick={() => setShowParams((s) => !s)}
              title="参数面板"
              className={cn(
                "inline-flex h-9 items-center gap-1 rounded-xl px-2 text-xs transition-colors",
                showParams
                  ? "bg-[var(--color-ink)] text-white"
                  : "text-[var(--color-ink-soft)] hover:bg-black/5",
              )}
            >
              <Settings2 className="h-[16px] w-[16px]" />
              参数
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Select
              compact
              value={model}
              onChange={(e) => setModel(e.target.value)}
              aria-label="模型"
            >
              {!hasCustom ? (
                allModels.map((m) => (
                  <option key={m} value={m}>
                    {resolveModelCaps(m, customModels).label}
                  </option>
                ))
              ) : (
                <>
                  <optgroup label="内置">
                    {BUILTIN_MODELS.map((m) => (
                      <option key={m} value={m}>
                        {BUILTIN_MODEL_CAPS[m].label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="自定义">
                    {customModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label || m.id}
                      </option>
                    ))}
                  </optgroup>
                </>
              )}
            </Select>
            <Button
              variant="primary"
              size="icon"
              disabled={loading || !prompt.trim()}
              onClick={generate}
              title="生成 (Ctrl/Cmd + Enter)"
            >
              {loading ? <Spinner /> : <ArrowUp className="h-4 w-4" strokeWidth={2.4} />}
            </Button>
          </div>
        </div>
        {showParams && (
          <div className="mt-4 border-t border-[var(--color-border)] pt-4">
            <ParameterPanel mode="generate" caps={caps} value={params} onChange={updateParam} />
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p.appendTo)}
            className="rounded-full border border-[var(--color-border)] bg-white px-3.5 py-1.5 text-xs text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]"
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && !results.length && (
        <div className="flex flex-col items-center gap-3 pt-6 text-[var(--color-ink-mute)]">
          <Spinner className="h-5 w-5 text-[var(--color-brand)]" />
          <span className="animate-pulse-soft text-sm">正在生成图片⋯⋯</span>
        </div>
      )}

      <ResultGrid
        entries={results}
        onEditImage={sendToEdit}
        onDelete={(id) => setResults((list) => list.filter((e) => e.id !== id))}
      />
    </div>
  );
}
