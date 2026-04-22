export type ImageModel = string;
export type ImageSize = string;
export type ImageQuality = string;

export type OutputFormat = "png" | "jpeg" | "webp";
export type Background = "transparent" | "opaque" | "auto";
export type Dalle3Style = "vivid" | "natural";
export type InputFidelity = "high" | "low";

export type ModelFamily = "gpt" | "dalle" | "custom";

export interface ModelCapability {
  id: string;
  label: string;
  description?: string;
  family: ModelFamily;
  sizes: ImageSize[];
  defaultSize: ImageSize;
  qualities: ImageQuality[];
  defaultQuality: ImageQuality;
  maxN: number;
  supportsBackground: boolean;
  supportsOutputFormat: boolean;
  supportsStyle: boolean;
  supportsInputFidelity: boolean;
  supportsEdit: boolean;
  maxPromptChars: number;
}

export type CustomModel = ModelCapability;

export interface GenerateParams {
  model: ImageModel;
  prompt: string;
  n?: number;
  size?: ImageSize;
  quality?: ImageQuality;
  output_format?: OutputFormat;
  output_compression?: number;
  background?: Background;
  style?: Dalle3Style;
  user?: string;
}

export interface EditImageRef {
  image_url?: string;
  file_id?: string;
}

export interface EditParams {
  model: ImageModel;
  prompt: string;
  images: EditImageRef[];
  mask?: EditImageRef;
  n?: number;
  size?: ImageSize;
  quality?: ImageQuality;
  output_format?: OutputFormat;
  output_compression?: number;
  background?: Background;
  input_fidelity?: InputFidelity;
  user?: string;
}

export interface ImagesResponseItem {
  b64_json?: string;
  url?: string;
  revised_prompt?: string;
}

export interface ImagesResponse {
  created: number;
  data: ImagesResponseItem[];
  output_format?: string;
  quality?: string;
  size?: string;
  background?: string;
  usage?: unknown;
}

export type HistoryKind = "generate" | "edit";

export interface HistoryEntry {
  id: string;
  kind: HistoryKind;
  createdAt: number;
  prompt: string;
  model: ImageModel;
  size?: ImageSize;
  quality?: ImageQuality;
  imageBlobKeys: string[];
  thumbDataUrl?: string;
  revisedPrompt?: string;
  params: GenerateParams | EditParams;
}

export interface AppSettings {
  apiKey: string;
  baseUrl: string;
  customModels: CustomModel[];
}
