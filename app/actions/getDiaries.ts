"use server";
import { createClient } from "@/lib/supabase/server";
import type { Diary } from "@/lib/types";

export async function getDiaries(): Promise<Diary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: diaries, error } = await supabase
    .from("diaries")
    .select("*")
    .eq("user_id", user.id)
    .eq("isDeleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading diaries:", error);
    return [];
  }

  return diaries || [];
}
