"use server";
import { createClient } from "@/lib/supabase/server";

export async function incrementUserStats(
  userId: string,
  wordDiff: number,
  entryDiff: number,
  stickerDiff: number,
  entryDate?: string
) {
  const supabase = await createClient();

  const { data: stats } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!stats) {
    // If no stats exist, we initialize them
    const newStats = {
      user_id: userId,
      total_words: Math.max(0, wordDiff),
      total_entries: Math.max(0, entryDiff),
      total_stickers: Math.max(0, stickerDiff),
      unique_days_count: entryDate ? 1 : 0,
      current_streak: entryDate ? 1 : 0,
      longest_streak: entryDate ? 1 : 0,
      last_entry_date: entryDate || null,
      updated_at: new Date().toISOString(),
    };
    await supabase.from("user_stats").insert(newStats);
    return;
  }

  const updatedStats = { ...stats, updated_at: new Date().toISOString() };
  updatedStats.total_words = Math.max(0, (stats.total_words || 0) + wordDiff);
  updatedStats.total_entries = Math.max(0, (stats.total_entries || 0) + entryDiff);
  updatedStats.total_stickers = Math.max(0, (stats.total_stickers || 0) + stickerDiff);

  // Handle Streaks & Unique Days (Only for new entries moving forward)
  if (entryDate && entryDiff > 0) {
    if (!stats.last_entry_date) {
      updatedStats.unique_days_count += 1;
      updatedStats.current_streak = 1;
      updatedStats.longest_streak = 1;
      updatedStats.last_entry_date = entryDate;
    } else if (entryDate > stats.last_entry_date) {
      updatedStats.unique_days_count += 1;
      
      const last = new Date(stats.last_entry_date);
      const current = new Date(entryDate);
      const diffDays = Math.round((current.getTime() - last.getTime()) / (1000 * 3600 * 24));
      
      if (diffDays === 1) {
        updatedStats.current_streak += 1;
      } else {
        updatedStats.current_streak = 1;
      }
      
      if (updatedStats.current_streak > updatedStats.longest_streak) {
        updatedStats.longest_streak = updatedStats.current_streak;
      }
      updatedStats.last_entry_date = entryDate;
    }
  }

  await supabase
    .from("user_stats")
    .update(updatedStats)
    .eq("user_id", userId);
}
