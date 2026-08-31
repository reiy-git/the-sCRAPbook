"use server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // First try selecting all profile fields including wallpaper_image_url
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, email, avatar_url, dashboard_background, wallpaper_image_url, header_color, created_at")
    .eq("id", user.id)
    .single();

  if (error) {
    // If wallpaper_image_url column is missing in schema, fallback to basic fields
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("profiles")
      .select("id, username, email, avatar_url, dashboard_background, header_color, created_at")
      .eq("id", user.id)
      .single();

    if (fallbackError) {
      // Return default profile if none exists
      return {
        id: user.id,
        username: user.email?.split("@")[0] || "User",
        email: user.email ?? null,
        avatar_url: null,
        dashboard_background: "grid-pattern",
        wallpaper_image_url: null,
        header_color: "#F0625A",
      };
    }
    return { ...fallbackData, wallpaper_image_url: null } as Profile;
  }

  return data as Profile;
}
