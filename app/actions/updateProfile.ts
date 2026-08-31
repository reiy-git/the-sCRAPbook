"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { DashboardBackground } from "@/lib/types";

export async function updateProfile(updates: {
  username?: string;
  avatar_url?: string | null;
  dashboard_background?: DashboardBackground;
  header_color?: string;
  wallpaper_image_url?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    // If error is about wallpaper_image_url column not existing in cache/db:
    if (error.message.includes("wallpaper_image_url") && "wallpaper_image_url" in updates) {
      const fallbackUpdates = { ...updates };
      delete fallbackUpdates.wallpaper_image_url;
      const { error: fallbackError } = await supabase
        .from("profiles")
        .update(fallbackUpdates)
        .eq("id", user.id);
      if (fallbackError) {
        throw new Error(fallbackError.message);
      }
      throw new Error(
        "Profile saved, but wallpaper_image_url column is missing in your Supabase database. Please run supabase/schema.sql in the Supabase SQL editor!",
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
}
