import { createClient } from "@/lib/supabase/client";

export async function uploadImage(
  file: File,
  bucket: "avatars" | "entry-images" | "wallpapers",
): Promise<string> {
  const supabase = createClient();
  const fileExt = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const folderMap = {
    avatars: "profiles",
    "entry-images": "entries",
    wallpapers: "wallpapers",
  };
  const filePath = `${folderMap[bucket]}/${fileName}`;

  const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return publicUrl;
}
