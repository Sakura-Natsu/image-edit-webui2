"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cpu,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Save,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { loadSettings, saveSettings } from "@/lib/settings";
import { clearAllHistory } from "@/lib/storage";
import {
  BUILTIN_MODEL_CAPS,
  DEFAULT_CUSTOM_MODEL_TEMPLATE,
} from "@/lib/model-config";
import type { AppSettings, CustomModel, ModelFamily } from "@/lib/types";
import { cn } from "@/lib/utils";

type DraftModel = CustomModel & { _originalId?: string };

function splitList(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function createDraft(): DraftModel {
  return {
    id: "",
    label: "",
    ...DEFAULT_CUSTOM_MODEL_TEMPLATE,
  };
}

export default function SettingsPage() {
  const { push } = useToast();
  const [settings, setSettings] = useState<AppSettings>({
    apiKey: "",
    baseUrl: "",
    customModels: [],
  });
  const [revealKey, setRevealKey] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [draft, setDraft] = useState<DraftModel | null>(null);
  const [sizesText, setSizesText] = useState("");
  const [qualitiesText, setQualitiesText] = useState("");

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const builtinIds = useMemo(() => new Set(Object.keys(BUILTIN_MODEL_CAPS)), []);

  function persist(next: AppSettings) {
    setSettings(next);
    saveSettings(next);
  }

  function handleSave() {
    saveSettings(settings);
    push("已保存", "success");
  }

  async function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    try {
      await clearAllHistory();
      setConfirmClear(false);
      push("已清空所有历史记录", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      push(`清空失败：${msg}`, "error");
    }
  }

  function openNewDraft() {
    const d = createDraft();
    setDraft(d);
    setSizesText(d.sizes.join(", "));
    setQualitiesText(d.qualities.join(", "));
  }

  function openEditDraft(m: CustomModel) {
    const d: DraftModel = { ...m, _originalId: m.id };
    setDraft(d);
    setSizesText(d.sizes.join(", "));
    setQualitiesText(d.qualities.join(", "));
  }

  function closeDraft() {
    setDraft(null);
  }

  function commitDraft() {
    if (!draft) return;
    const id = draft.id.trim();
    const label = draft.label.trim() || id;
    if (!id) {
      push("模型 ID 不能为空", "error");
      return;
    }
    if (builtinIds.has(id) && draft._originalId !== id) {
      push("ID 与内置模型冲突", "error");
      return;
    }
    const sizes = splitList(sizesText);
    const qualities = splitList(qualitiesText);
    if (!sizes.length) {
      push("Sizes 不能为空", "error");
      return;
    }
    if (!qualities.length) {
      push("Qualities 不能为空", "error");
      return;
    }

    const cleaned: CustomModel = {
      id,
      label,
      description: draft.description,
      family: draft.family,
      sizes,
      defaultSize: sizes.includes(draft.defaultSize) ? draft.defaultSize : sizes[0],
      qualities,
      defaultQuality: qualities.includes(draft.defaultQuality)
        ? draft.defaultQuality
        : qualities[0],
      maxN: Math.max(1, Math.min(10, Math.floor(draft.maxN || 1))),
      supportsBackground: draft.supportsBackground,
      supportsOutputFormat: draft.supportsOutputFormat,
      supportsStyle: draft.supportsStyle,
      supportsInputFidelity: draft.supportsInputFidelity,
      supportsEdit: draft.supportsEdit,
      maxPromptChars: Math.max(100, Math.floor(draft.maxPromptChars || 32000)),
    };

    const list = [...settings.customModels];
    if (draft._originalId) {
      const idx = list.findIndex((m) => m.id === draft._originalId);
      if (idx >= 0) list[idx] = cleaned;
      else list.push(cleaned);
    } else {
      if (list.some((m) => m.id === cleaned.id)) {
        push("已存在同 ID 的自定义模型", "error");
        return;
      }
      list.push(cleaned);
    }
    persist({ ...settings, customModels: list });
    closeDraft();
    push(draft._originalId ? "已更新模型" : "已添加模型", "success");
  }

  function deleteModel(id: string) {
    const list = settings.customModels.filter((m) => m.id !== id);
    persist({ ...settings, customModels: list });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10 md:py-12">
      <header className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-[var(--color-brand)]" />
        <h1 className="font-[family-name:var(--font-serif)] text-2xl">Settings</h1>
      </header>

      <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">API Key</label>
          <div className="relative">
            <Input
              type={revealKey ? "text" : "password"}
              placeholder="sk-..."
              value={settings.apiKey}
              onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
              className="pr-10 font-mono"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setRevealKey((v) => !v)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-[var(--color-ink-mute)] hover:text-[var(--color-ink)]"
              aria-label="toggle visibility"
            >
              {revealKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-[var(--color-ink-mute)]">
            保存在浏览器 localStorage。若留空，将使用服务端 <code>.env.local</code> 中的 <code>OPENAI_API_KEY</code>。
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Base URL（可选）</label>
          <Input
            placeholder="https://api.openai.com/v1"
            value={settings.baseUrl}
            onChange={(e) => setSettings((s) => ({ ...s, baseUrl: e.target.value }))}
            className="font-mono"
            spellCheck={false}
          />
          <p className="text-xs text-[var(--color-ink-mute)]">
            支持任何 OpenAI 兼容端点。留空则使用官方地址。
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="primary" onClick={handleSave}>
            <Save className="h-4 w-4" /> 保存设置
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-[var(--color-ink-soft)]" />
            <h2 className="text-sm font-medium">自定义模型</h2>
            <span className="text-xs text-[var(--color-ink-mute)]">
              {settings.customModels.length} 个
            </span>
          </div>
          <Button size="sm" variant="secondary" onClick={openNewDraft} disabled={!!draft}>
            <Plus className="h-3.5 w-3.5" /> 添加
          </Button>
        </div>

        <p className="text-xs text-[var(--color-ink-mute)]">
          添加后可在文生图与图片编辑页的模型下拉中选择。支持任意 OpenAI 兼容模型 ID，并可自定义尺寸、质量、参数能力。
        </p>

        {settings.customModels.length > 0 && (
          <ul className="flex flex-col gap-2">
            {settings.customModels.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/40 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.label || m.id}</div>
                  <div className="truncate font-mono text-xs text-[var(--color-ink-mute)]">
                    {m.id} · {m.family} · {m.sizes.length} sizes · n≤{m.maxN}
                    {m.supportsEdit ? " · 可编辑" : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="rounded-lg p-1.5 text-[var(--color-ink-mute)] hover:bg-black/5 hover:text-[var(--color-ink)]"
                    onClick={() => openEditDraft(m)}
                    title="编辑"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="rounded-lg p-1.5 text-[var(--color-ink-mute)] hover:bg-black/5 hover:text-[var(--color-danger)]"
                    onClick={() => deleteModel(m.id)}
                    title="删除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {draft && (
          <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border-strong)] bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                {draft._originalId ? "编辑自定义模型" : "添加自定义模型"}
              </h3>
              <button
                onClick={closeDraft}
                className="rounded p-1 text-[var(--color-ink-mute)] hover:text-[var(--color-ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-ink-soft)]">
                  模型 ID <span className="text-[var(--color-danger)]">*</span>
                </label>
                <Input
                  value={draft.id}
                  onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                  placeholder="my-image-model"
                  className="font-mono"
                  spellCheck={false}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-ink-soft)]">显示名</label>
                <Input
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  placeholder="My Image Model"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-ink-soft)]">家族</label>
              <Select
                value={draft.family}
                onChange={(e) =>
                  setDraft({ ...draft, family: e.target.value as ModelFamily })
                }
              >
                <option value="custom">custom</option>
                <option value="gpt">gpt（参考 GPT 图像模型行为）</option>
                <option value="dalle">dalle（参考 DALL·E 行为）</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-ink-soft)]">
                  Sizes（逗号分隔）
                </label>
                <Input
                  value={sizesText}
                  onChange={(e) => setSizesText(e.target.value)}
                  placeholder="auto, 1024x1024, 1536x1024"
                  className="font-mono"
                  spellCheck={false}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-ink-soft)]">默认 Size</label>
                <Input
                  value={draft.defaultSize}
                  onChange={(e) => setDraft({ ...draft, defaultSize: e.target.value })}
                  placeholder="auto"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-ink-soft)]">
                  Qualities（逗号分隔）
                </label>
                <Input
                  value={qualitiesText}
                  onChange={(e) => setQualitiesText(e.target.value)}
                  placeholder="auto, low, medium, high"
                  className="font-mono"
                  spellCheck={false}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-ink-soft)]">默认 Quality</label>
                <Input
                  value={draft.defaultQuality}
                  onChange={(e) => setDraft({ ...draft, defaultQuality: e.target.value })}
                  placeholder="auto"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-ink-soft)]">最大数量 (n)</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={draft.maxN}
                  onChange={(e) =>
                    setDraft({ ...draft, maxN: Number(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-ink-soft)]">
                  Prompt 最大字符数
                </label>
                <Input
                  type="number"
                  min={100}
                  value={draft.maxPromptChars}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      maxPromptChars: Number(e.target.value) || 32000,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/40 p-3">
              {([
                ["supportsEdit", "支持图片编辑"],
                ["supportsBackground", "支持 background"],
                ["supportsOutputFormat", "支持 output_format"],
                ["supportsInputFidelity", "支持 input_fidelity"],
                ["supportsStyle", "支持 style"],
              ] as const).map(([key, label]) => (
                <label
                  key={key}
                  className={cn(
                    "flex items-center gap-2 text-xs",
                    "text-[var(--color-ink-soft)]",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={draft[key]}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.checked } as DraftModel)
                    }
                    className="h-3.5 w-3.5 accent-[var(--color-ink)]"
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeDraft}>
                取消
              </Button>
              <Button variant="primary" size="sm" onClick={commitDraft}>
                <Save className="h-3.5 w-3.5" /> 保存模型
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <h2 className="text-sm font-medium">数据管理</h2>
        <p className="text-xs text-[var(--color-ink-mute)]">
          所有生成过的图片和元数据保存在浏览器 IndexedDB 中。你可以一键清空所有历史记录。
        </p>
        <div>
          <Button variant={confirmClear ? "danger" : "secondary"} onClick={handleClear}>
            <Trash2 className="h-4 w-4" />
            {confirmClear ? "再点一次确认清空" : "清空所有历史记录"}
          </Button>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-alt)]/40 p-5 text-xs text-[var(--color-ink-soft)]">
        <p className="mb-1 font-medium text-[var(--color-ink)]">快捷键</p>
        <p>
          在文生图页按 <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-sm">Ctrl/⌘ + Enter</kbd> 即可快速提交。
        </p>
      </section>
    </div>
  );
}
