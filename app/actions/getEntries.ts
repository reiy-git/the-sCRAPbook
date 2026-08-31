"use server";
import { createClient } from "@/lib/supabase/server";
import type { DiaryEntry, Sticker } from "@/lib/types";

function normalizeEntries(rows: unknown[] | null): DiaryEntry[] {
  if (!rows) return [];
  return rows.map((row) => {
    const entry = row as DiaryEntry & { stickers_json?: Sticker[] | string };
    const stickers = Array.isArray(entry.stickers_json)
      ? entry.stickers_json
      : [];
    return { ...entry, stickers_json: stickers };
  });
}

export async function getEntries(
  diaryId: string | null | undefined,
): Promise<DiaryEntry[]> {
  if (!diaryId) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: entries, error } = await supabase
    .from("entries")
    .select("*")
    .eq("diary_id", diaryId)
    .eq("isDeleted", false)
    .order("entry_date", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error loading entries:", error);
    return [];
  }

  // Deduplicate: Keep only the latest entry for each date
  const deduplicated = new Map<string, any>();
  (entries || []).forEach((entry) => {
    if (!deduplicated.has(entry.entry_date)) {
      deduplicated.set(entry.entry_date, entry);
    }
  });

  return normalizeEntries(Array.from(deduplicated.values()));
}
