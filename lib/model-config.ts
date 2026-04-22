import type {
  Background,
  CustomModel,
  ImageModel,
  ModelCapability,
  OutputFormat,
} from "./types";

export const BUILTIN_MODEL_CAPS: Record<string, ModelCapability> = {
  "gpt-image-1.5": {
    id: "gpt-image-1.5",
    label: "GPT Image 1.5",
    description: "最新 GPT 图像模型，质量最高",
    family: "gpt",
    sizes: ["auto", "1024x1024", "1536x1024", "1024x1536"],
    defaultSize: "auto",
    qualities: ["auto", "low", "medium", "high"],
    defaultQuality: "auto",
    maxN: 10,
    supportsBackground: true,
    supportsOutputFormat: true,
    supportsStyle: false,
    supportsInputFidelity: true,
    supportsEdit: true,
    maxPromptChars: 32000,
  },
  "gpt-image-1": {
    id: "gpt-image-1",
    label: "GPT Image 1",
    description: "平衡质量与速度",
    family: "gpt",
    sizes: ["auto", "1024x1024", "1536x1024", "1024x1536"],
    defaultSize: "auto",
    qualities: ["auto", "low", "medium", "high"],
    defaultQuality: "auto",
    maxN: 10,
    supportsBackground: true,
    supportsOutputFormat: true,
    supportsStyle: false,
    supportsInputFidelity: true,
    supportsEdit: true,
    maxPromptChars: 32000,
  },
  "gpt-image-1-mini": {
    id: "gpt-image-1-mini",
    label: "GPT Image 1 Mini",
    description: "最便宜的 GPT 图像模型",
    family: "gpt",
    sizes: ["auto", "1024x1024", "1536x1024", "1024x1536"],
    defaultSize: "auto",
    qualities: ["auto", "low", "medium", "high"],
    defaultQuality: "auto",
    maxN: 10,
    supportsBackground: true,
    supportsOutputFormat: true,
    supportsStyle: false,
    supportsInputFidelity: true,
    supportsEdit: true,
    maxPromptChars: 32000,
  },
  "dall-e-3": {
    id: "dall-e-3",
    label: "DALL·E 3",
    description: "高质量艺术风格",
    family: "dalle",
    sizes: ["1024x1024", "1792x1024", "1024x1792"],
    defaultSize: "1024x1024",
    qualities: ["standard", "hd"],
    defaultQuality: "standard",
    maxN: 1,
    supportsBackground: false,
    supportsOutputFormat: false,
    supportsStyle: true,
    supportsInputFidelity: false,
    supportsEdit: false,
    maxPromptChars: 4000,
  },
  "dall-e-2": {
    id: "dall-e-2",
    label: "DALL·E 2",
    description: "经典 DALL·E 模型，支持编辑",
    family: "dalle",
    sizes: ["256x256", "512x512", "1024x1024"],
    defaultSize: "1024x1024",
    qualities: ["standard"],
    defaultQuality: "standard",
    maxN: 10,
    supportsBackground: false,
    supportsOutputFormat: false,
    supportsStyle: false,
    supportsInputFidelity: false,
    supportsEdit: true,
    maxPromptChars: 1000,
  },
};

export const BUILTIN_MODELS: ImageModel[] = Object.keys(BUILTIN_MODEL_CAPS);

/** Template used when creating a new custom model in Settings. */
export const DEFAULT_CUSTOM_MODEL_TEMPLATE: Omit<CustomModel, "id" | "label"> = {
  family: "custom",
  sizes: ["auto", "1024x1024", "1536x1024", "1024x1536"],
  defaultSize: "auto",
  qualities: ["auto", "low", "medium", "high"],
  defaultQuality: "auto",
  maxN: 4,
  supportsBackground: true,
  supportsOutputFormat: true,
  supportsStyle: false,
  supportsInputFidelity: true,
  supportsEdit: true,
  maxPromptChars: 32000,
};

/** Last-resort caps used when an unknown model id is provided. */
const FALLBACK_CAPS: ModelCapability = {
  id: "__fallback__",
  label: "Unknown",
  family: "custom",
  sizes: ["auto", "1024x1024"],
  defaultSize: "auto",
  qualities: ["auto"],
  defaultQuality: "auto",
  maxN: 1,
  supportsBackground: false,
  supportsOutputFormat: false,
  supportsStyle: false,
  supportsInputFidelity: false,
  supportsEdit: true,
  maxPromptChars: 32000,
};

export function resolveModelCaps(
  model: ImageModel,
  customModels: CustomModel[] = [],
): ModelCapability {
  const builtin = BUILTIN_MODEL_CAPS[model];
  if (builtin) return builtin;
  const custom = customModels.find((c) => c.id === model);
  if (custom) return custom;
  return { ...FALLBACK_CAPS, id: model, label: model };
}

export function listAllModels(customModels: CustomModel[] = []): ImageModel[] {
  const ids = new Set<string>(BUILTIN_MODELS);
  for (const c of customModels) ids.add(c.id);
  return Array.from(ids);
}

export const BACKGROUND_OPTIONS: Background[] = ["auto", "transparent", "opaque"];
export const OUTPUT_FORMAT_OPTIONS: OutputFormat[] = ["png", "jpeg", "webp"];
