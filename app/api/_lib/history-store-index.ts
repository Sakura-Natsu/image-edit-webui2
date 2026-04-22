import { isSupabaseEnabled } from "@/lib/supabase-server";
import type { CreateHistoryInput, ImageFileResult } from "./history-store";
import type { HistoryEntry } from "@/lib/types";

// Lazily select the driver to avoid importing Supabase SDK when it's not needed.
// Using dynamic re-exports to keep the module-level selection simple.
let _driver: {
  readHistory(): Promise<HistoryEntry[]>;
  createEntry(input: CreateHistoryInput): Promise<HistoryEntry>;
  deleteEntry(id: string): Promise<boolean>;
  clearAll(): Promise<void>;
  readImage(filename: string): Promise<ImageFileResult | null>;
} | null = null;

async function driver() {
  if (_driver) return _driver;
  if (isSupabaseEnabled()) {
    _driver = await import("./history-store-supabase");
  } else {
    _driver = await import("./history-store");
  }
  return _driver;
}

export async function readHistory(): Promise<HistoryEntry[]> {
  return (await driver()).readHistory();
}

export async function createEntry(
  input: CreateHistoryInput,
): Promise<HistoryEntry> {
  return (await driver()).createEntry(input);
}

export async function deleteEntry(id: string): Promise<boolean> {
  return (await driver()).deleteEntry(id);
}

export async function clearAll(): Promise<void> {
  return (await driver()).clearAll();
}

export async function readImage(
  filename: string,
): Promise<ImageFileResult | null> {
  return (await driver()).readImage(filename);
}

export type { CreateHistoryInput, ImageFileResult };
