"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Sticker } from "@/lib/types";

import { incrementUserStats } from "./updateUserStats";

function countWords(title: string, content: string) {
  const text = `${title || ""} ${content || ""}`.trim();
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

async function assertDiaryOwner(diaryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: diary, error } = await supabase
    .from("diaries")
    .select("id")
    .eq("id", diaryId)
    .eq("user_id", user.id)
    .eq("isDeleted", false)
    .single();

  if (error || !diary) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function addEntry(
  diaryId: string,
  title: string,
  content: string,
  entryDate?: string,
) {
  const { supabase, user } = await assertDiaryOwner(diaryId);
  
  const now = new Date().toISOString();
  const dateStr = entryDate || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase.from("entries").insert({
    diary_id: diaryId,
    user_id: user.id,
    title,
    content,
    entry_date: dateStr,
    stickers_json: [],
    isDeleted: false,
    created_at: now,
    updated_at: now,
  }).select("id").single();

  if (error) throw new Error(error.message);
  
  await incrementUserStats(user.id, countWords(title, content), 1, 0, dateStr);
  revalidatePath(`/diary/${diaryId}`);
  return data.id;
}

export async function editEntry(
  diaryId: string,
  entryId: string,
  title: string,
  content: string,
  stickers_json?: Sticker[],
) {
  const { supabase, user } = await assertDiaryOwner(diaryId);

  // Fetch old to calculate difference
  const { data: oldEntry } = await supabase
    .from("entries")
    .select("title, content, stickers_json")
    .eq("id", entryId)
    .single();
    
  let wordDiff = 0;
  let stickerDiff = 0;

  if (oldEntry) {
    const oldWords = countWords(oldEntry.title, oldEntry.content);
    const newWords = countWords(title, content);
    wordDiff = newWords - oldWords;
    
    if (stickers_json !== undefined) {
      const oldStickersCount = Array.isArray(oldEntry.stickers_json) ? oldEntry.stickers_json.length : 0;
      stickerDiff = stickers_json.length - oldStickersCount;
    }
  }

  const payload: Record<string, unknown> = {
    title,
    content,
    updated_at: new Date().toISOString(),
  };
  if (stickers_json !== undefined) {
    payload.stickers_json = stickers_json;
  }

  const { error } = await supabase
    .from("entries")
    .update(payload)
    .eq("id", entryId)
    .eq("diary_id", diaryId)
    .eq("isDeleted", false);

  if (error) throw new Error(error.message);
  
  await incrementUserStats(user.id, wordDiff, 0, stickerDiff);
  revalidatePath(`/diary/${diaryId}`);
}

export async function deleteEntry(diaryId: string, entryId: string) {
  const { supabase, user } = await assertDiaryOwner(diaryId);

  // Get the entry date and content so we can delete all hidden duplicates and decrement stats
  const { data: entry } = await supabase
    .from("entries")
    .select("title, content, stickers_json, entry_date")
    .eq("id", entryId)
    .single();

  let wordDiff = 0;
  let stickerDiff = 0;
  
  if (entry) {
    wordDiff = -countWords(entry.title, entry.content);
    stickerDiff = -(Array.isArray(entry.stickers_json) ? entry.stickers_json.length : 0);
  }

  if (entry?.entry_date) {
    const { error } = await supabase
      .from("entries")
      .update({ isDeleted: true, updated_at: new Date().toISOString() })
      .eq("diary_id", diaryId)
      .eq("entry_date", entry.entry_date);
      
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("entries")
      .update({ isDeleted: true, updated_at: new Date().toISOString() })
      .eq("id", entryId)
      .eq("diary_id", diaryId);

    if (error) throw new Error(error.message);
  }

  await incrementUserStats(user.id, wordDiff, -1, stickerDiff);
  revalidatePath(`/diary/${diaryId}`);
}
