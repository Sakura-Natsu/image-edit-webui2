"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Wand2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Spinner from "@/components/ui/Spinner";
import ImageDropzone from "@/components/ImageDropzone";
import MaskCanvas from "@/components/MaskCanvas";
import ParameterPanel, {
  type ParameterState,
  defaultsForCaps,
} from "@/components/ParameterPanel";
import ResultGrid from "@/components/ResultGrid";
import { useToast } from "@/components/ui/Toast";
import { callEdit } from "@/lib/openai-client";
import {
  BUILTIN_MODELS,
  BUILTIN_MODEL_CAPS,
  resolveModelCaps,
} from "@/lib/model-config";
import { saveEntry } from "@/lib/storage";
import { loadSettings } from "@/lib/settings";
import { createLogger, describeError } from "@/lib/logger";
import type {
  CustomModel,
  EditParams,
  HistoryEntry,
  ImageModel,
} from "@/lib/types";

const log = createLogger("edit-page");

const BUILTIN_EDITABLE: ImageModel[] = BUILTIN_MODELS.filter(
  (m) => BUILTIN_MODEL_CAPS[m].supportsEdit,
);

export default function EditPage() {
  const { push } = useToast();
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [model, setModel] = useState<ImageModel>("gpt-image-1");
  const [images, setImages] = useState<string[]>([]);
  const [mask, setMask] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [params, setParams] = useState<ParameterState>(() =>
    defaultsForCaps(BUILTIN_MODEL_CAPS["gpt-image-1"]),
  );
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HistoryEntry[]>([]);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCustomModels(loadSettings().customModels);
  }, []);

  useEffect(() => {
    const seed = typeof window !== "undefined" ? sessionStorage.getItem("edit:seed") : null;
    if (seed) {
      setImages([seed]);
      sessionStorage.removeItem("edit:seed");
    }
  }, []);

  const caps = useMemo(
    () => resolveModelCaps(model, customModels),
    [model, customModels],
  );

  const customEditable = useMemo(
    () => customModels.filter((m) => m.supportsEdit),
    [customModels],
  );

  useEffect(() => {
    if (!caps.supportsEdit) {
      setModel(BUILTIN_EDITABLE[0]);
      return;
    }
    setParams((p) => ({
      ...defaultsForCaps(caps),
      n: Math.min(p.n, caps.maxN) || 1,
    }));
  }, [caps]);

  const canMask = images.length === 1;

  function updateParam(patch: Partial<ParameterState>) {
    setParams((p) => ({ ...p, ...patch }));
  }

  async function submit() {
    if (!images.length) {
      push("请先上传至少一张图片", "info");
      return;
    }
    if (!prompt.trim()) {
      push("请输入编辑提示词", "info");
      promptRef.current?.focus();
      return;
    }
    setLoading(true);
    const payload: EditParams = {
      model,
      prompt: prompt.trim(),
      images: images.map((image_url) => ({ image_url })),
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
    if (caps.supportsInputFidelity) payload.input_fidelity = params.input_fidelity;
    if (mask && canMask) payload.mask = { image_url: mask };

    try {
      const res = await callEdit(payload);
      const fmt = payload.output_format ?? "png";
      const images = res.data
        .filter((d) => !!d.b64_json)
        .map((d) => ({ b64: d.b64_json!, format: fmt }));
      if (!images.length) {
        log.warn("响应 data 中无 b64_json", res);
        throw new Error("上游未返回 b64_json 图片（检查浏览器控制台查看原始响应）");
      }
      const entry = await saveEntry({
        kind: "edit",
        prompt: prompt.trim(),
        model,
        size: payload.size,
        quality: payload.quality,
        revisedPrompt: res.data.find((d) => d.revised_prompt)?.revised_prompt,
        params: payload,
        images,
      });
      setResults((list) => [entry, ...list]);
      push("编辑完成", "success");
    } catch (err) {
      log.error("编辑失败", err);
      push(`编辑失败：${describeError(err)}`, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 md:py-12 lg:grid-cols-[1.15fr_1fr]">
      <div className="flex flex-col gap-4">
        <header className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-[var(--color-brand)]" />
          <h1 className="font-[family-name:var(--font-serif)] text-2xl">Edit images</h1>
        </header>

        <ImageDropzone images={images} onChange={setImages} max={16} />

        {canMask && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-mute)]">
              可选：绘制遮罩
            </h3>
            <MaskCanvas baseImageUrl={images[0]} onChange={setMask} />
          </div>
        )}
        {images.length > 1 && (
          <p className="rounded-xl border border-[var(--color-border)] bg-white/60 px-4 py-3 text-xs text-[var(--color-ink-soft)]">
            上传了多张参考图，遮罩绘制已禁用；模型会综合所有参考图进行编辑。
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm focus-within:shadow-md">
          <textarea
            ref={promptRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="例如：把背景换成夕阳海边；把猫改成戴着渔夫帽⋯⋯"
            className="block w-full bg-transparent px-2 py-2 text-base leading-relaxed outline-none placeholder:text-[var(--color-ink-mute)]"
          />
          <div className="flex items-center justify-between pt-2">
            <Select
              compact
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <optgroup label="内置">
                {BUILTIN_EDITABLE.map((m) => (
                  <option key={m} value={m}>
                    {BUILTIN_MODEL_CAPS[m].label}
                  </option>
                ))}
              </optgroup>
              {customEditable.length > 0 && (
                <optgroup label="自定义">
                  {customEditable.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label || m.id}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
            <Button
              variant="primary"
              size="icon"
              disabled={loading || !prompt.trim() || !images.length}
              onClick={submit}
            >
              {loading ? <Spinner /> : <ArrowUp className="h-4 w-4" strokeWidth={2.4} />}
            </Button>
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <ParameterPanel mode="edit" caps={caps} value={params} onChange={updateParam} />
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-[var(--color-ink-mute)]">
            <Spinner className="h-4 w-4 text-[var(--color-brand)]" />
            <span className="animate-pulse-soft">正在编辑⋯⋯</span>
          </div>
        )}

        <ResultGrid
          entries={results}
          onDelete={(id) => setResults((list) => list.filter((e) => e.id !== id))}
        />
      </div>
    </div>
  );
}
