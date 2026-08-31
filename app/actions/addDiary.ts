"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Diary } from "@/lib/types";

export async function addDiary(
  title: string,
  description: string,
  cover_image_url?: string | null,
  theme_color?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("diaries")
    .insert({
      user_id: user.id,
      description,
      title,
      cover_image_url: cover_image_url || null,
      theme_color: theme_color || "#FAF8F5",
      created_at: now,
      updated_at: now,
      isDeleted: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");

  return data as Diary;
}
