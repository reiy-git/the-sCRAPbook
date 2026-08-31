"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function editDiary(
  diaryID: string,
  diaryTitle: string,
  dairyDescription: string,
  cover_image_url?: string | null,
  theme_color?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const payload: Record<string, unknown> = {
    title: diaryTitle,
    description: dairyDescription,
    updated_at: new Date().toISOString(),
  };

  if (cover_image_url !== undefined) {
    payload.cover_image_url = cover_image_url;
  }
  if (theme_color !== undefined) {
    payload.theme_color = theme_color;
  }

  const { error } = await supabase
    .from("diaries")
    .update(payload)
    .eq("id", diaryID)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}
