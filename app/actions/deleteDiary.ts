"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteDiary(diaryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("diaries")
    .update({ isDeleted: true, updated_at: new Date().toISOString() })
    .eq("id", diaryId)
    .eq("user_id", user.id);

  if (error) throw error;

  // Also soft-delete all entries belonging to this diary
  const { error: entriesError } = await supabase
    .from("entries")
    .update({ isDeleted: true, updated_at: new Date().toISOString() })
    .eq("diary_id", diaryId)
    .eq("user_id", user.id);

  if (entriesError) throw entriesError;

  revalidatePath("/dashboard");
}
