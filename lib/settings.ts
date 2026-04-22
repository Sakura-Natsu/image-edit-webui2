import type { AppSettings } from "./types";

const KEY = "image-webui:settings";

const DEFAULT: AppSettings = {
  apiKey: "",
  baseUrl: "",
  customModels: [],
};

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT,
      ...parsed,
      customModels: Array.isArray(parsed.customModels) ? parsed.customModels : [],
    };
  } catch {
    return DEFAULT;
  }
}

export function saveSettings(next: AppSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function hasApiKey(): boolean {
  return loadSettings().apiKey.trim().length > 0;
}
