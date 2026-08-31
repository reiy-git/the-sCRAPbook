"use server";

import { createClient } from "@/lib/supabase/server";
import type { Sticker } from "@/lib/types";

export interface UserInsights {
  username: string;
  avatarUrl: string | null;
  memberSince: string;
  totalWords: number;
  totalEntries: number;
  uniqueDaysCount: number;
  currentStreak: number;
  longestStreak: number;
  totalStickers: number;
  totalDiaries: number;
  avgWordsPerEntry: number;
  rankTitle: string;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export async function getUserInsights(): Promise<UserInsights | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Fetch profile and active diaries in parallel
  const [profileRes, diariesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, avatar_url, created_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("diaries")
      .select("id")
      .eq("user_id", user.id)
      .eq("isDeleted", false),
  ]);

  const profile = profileRes.data;
  const activeDiaries = diariesRes.data || [];
  const diaryCount = activeDiaries.length;
  const activeDiaryIds = activeDiaries.map((d) => d.id);

  let allEntries: { title: string; content: string; entry_date: string; stickers_json?: Sticker[] }[] = [];

  // 2. Only fetch entries if the user has active diaries
  if (activeDiaryIds.length > 0) {
    const entriesRes = await supabase
      .from("entries")
      .select("title, content, entry_date, stickers_json")
      .eq("user_id", user.id)
      .in("diary_id", activeDiaryIds)
      .eq("isDeleted", false)
      .order("entry_date", { ascending: true });

    allEntries = (entriesRes.data || []) as typeof allEntries;
  }

  let totalWords = 0;
  let totalStickers = 0;
  const uniqueDatesSet = new Set<string>();

  allEntries.forEach((entry) => {
    // Count words from content and title, but ignore the default "Untitled entry"
    const titleToCount = (entry.title && entry.title !== "Untitled entry") ? entry.title : "";
    totalWords += countWords(`${titleToCount} ${entry.content || ""}`);

    if (Array.isArray(entry.stickers_json)) {
      totalStickers += entry.stickers_json.length;
    }

    if (entry.entry_date) {
      uniqueDatesSet.add(entry.entry_date);
    }
  });

  // Calculate streaks from sorted unique dates
  const sortedDates = Array.from(uniqueDatesSet).sort();
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDateObj: Date | null = null;

  sortedDates.forEach((dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const currentDateObj = new Date(y, m - 1, d);

    if (!prevDateObj) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round(
        (currentDateObj.getTime() - prevDateObj.getTime()) / (1000 * 3600 * 24),
      );
      tempStreak = diffDays === 1 ? tempStreak + 1 : 1;
    }

    if (tempStreak > longestStreak) longestStreak = tempStreak;
    prevDateObj = currentDateObj;
  });

  // Current streak: check if last entry is today or yesterday
  let currentStreak = 0;
  if (sortedDates.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastParts = sortedDates[sortedDates.length - 1].split("-").map(Number);
    const lastDate = new Date(lastParts[0], lastParts[1] - 1, lastParts[2]);
    lastDate.setHours(0, 0, 0, 0);
    const diffFromToday = Math.round(
      (today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24),
    );
    currentStreak = diffFromToday <= 1 ? tempStreak : 0;
  }

  // Rank based on content words and days
  let rankTitle = "Street Rookie";
  if (totalWords > 5000 || uniqueDatesSet.size >= 30) {
    rankTitle = "Legendary Writer";
  } else if (totalWords > 2000 || uniqueDatesSet.size >= 14) {
    rankTitle = "Master Author";
  } else if (totalWords > 500 || uniqueDatesSet.size >= 5) {
    rankTitle = "Street Scribe";
  } else if (totalWords > 100 || uniqueDatesSet.size >= 2) {
    rankTitle = "New Creator";
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently";

  return {
    username: profile?.username || "Creator",
    avatarUrl: profile?.avatar_url || null,
    memberSince,
    totalWords,
    totalEntries: allEntries.length,
    uniqueDaysCount: uniqueDatesSet.size,
    currentStreak,
    longestStreak,
    totalStickers,
    totalDiaries: diaryCount,
    avgWordsPerEntry: allEntries.length > 0 ? Math.round(totalWords / allEntries.length) : 0,
    rankTitle,
  };
}
