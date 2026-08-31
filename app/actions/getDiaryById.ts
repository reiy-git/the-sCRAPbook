"use server";
import { createClient } from "@/lib/supabase/server";
import type { Diary } from "@/lib/types";

export async function getDiaryById(diaryID: string): Promise<Diary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: diary, error } = await supabase
    .from("diaries")
    .select("*")
    .eq("id", diaryID)
    .eq("user_id", user.id)
    .eq("isDeleted", false)
    .single();

  if (error) {
    console.error("Error loading diary:", error);
    return null;
  }

  return diary || null;
}
