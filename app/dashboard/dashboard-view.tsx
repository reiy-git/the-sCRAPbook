"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Header from "@/app/components/header";
import DiaryCard from "@/app/components/diary";
import ColorPicker from "@/app/components/color-picker";
import { addDiary } from "@/app/actions/addDiary";
import { uploadImage } from "@/lib/supabase/storage";
import { transitionBouncy } from "@/lib/motion";
import type { DashboardBackground, Diary, Profile } from "@/lib/types";

const wallpaperClass: Record<DashboardBackground, string> = {
  "grid-pattern": "bg-grid-pattern",
  "sand-waves": "bg-sand-waves",
  "acid-gradient": "bg-acid-gradient",
};

export default function DashboardView({
  initialDiaries,
  initialProfile,
}: {
  initialDiaries: Diary[];
  initialProfile: Profile | null;
}) {
  // Server data is authoritative; using an old cache here could resurrect deleted diaries.
  const [diaries, setDiaries] = useState<Diary[]>(initialDiaries);
  const [profile, setProfile] = useState<Profile | null>(() => {
    if (initialProfile) return initialProfile;
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("vybe_profile_cache");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [diaryValues, setDiaryValues] = useState({
    title: "",
    description: "",
    theme_color: "#FAF8F5",
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [customWallpaper, setCustomWallpaper] = useState<string | null>(
    initialProfile?.wallpaper_image_url || null,
  );

  useEffect(() => {
    // Persist fresh server data to localStorage caches for instant next-visit load
    if (typeof window !== "undefined") {
      if (initialDiaries && initialDiaries.length > 0) {
        try { localStorage.setItem("vybe_diaries_cache", JSON.stringify(initialDiaries)); } catch {}
      }
      if (initialProfile) {
        try { localStorage.setItem("vybe_profile_cache", JSON.stringify(initialProfile)); } catch {}
      }

      const localWp = localStorage.getItem("vybe_wallpaper_url");
      if (localWp && !initialProfile?.wallpaper_image_url) {
        setCustomWallpaper(localWp);
      }
    }

    const handleWallpaperUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ url?: string | null; pattern?: string }>;
      if (customEvent.detail.url !== undefined) {
        setCustomWallpaper(customEvent.detail.url);
      }
    };

    window.addEventListener("vybe_wallpaper_update", handleWallpaperUpdate);
    return () => window.removeEventListener("vybe_wallpaper_update", handleWallpaperUpdate);
  }, [initialDiaries, initialProfile]);

  useEffect(() => {
    try {
      localStorage.setItem("vybe_diaries_cache", JSON.stringify(diaries));
    } catch {}
  }, [diaries]);

  useEffect(() => {
    const currentName = profile?.username || initialProfile?.username;
    if (typeof document !== "undefined") {
      document.title = currentName ? `${currentName}'s Diaries — the sCRAPbook` : "Your Diaries — the sCRAPbook";
    }
  }, [profile?.username, initialProfile?.username]);

  function closeCreate() {
    setCreating(false);
    setCoverFile(null);
    setDiaryValues({ title: "", description: "", theme_color: "#FAF8F5" });
  }

  const handleAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!diaryValues.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      let coverUrl: string | null = null;
      if (coverFile) {
        coverUrl = await uploadImage(coverFile, "entry-images");
      }
      const diary = await addDiary(
        diaryValues.title,
        diaryValues.description,
        coverUrl,
        diaryValues.theme_color,
      );
      setDiaries((current) => [...current, diary]);
      toast.success("Diary created");
      closeCreate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create diary",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const wallpaper =
    wallpaperClass[profile?.dashboard_background || "grid-pattern"];

  return (
    <div
      className={`min-h-screen ${customWallpaper ? "bg-cover bg-center bg-fixed" : wallpaper}`}
      style={
        customWallpaper
          ? {
              backgroundImage: `url(${customWallpaper})`,
            }
          : undefined
      }
    >
      <Header initialProfile={profile || initialProfile} />
      <div className="mb-8 items-center text-3xl w-full bg-[#FAF8F5]/85 backdrop-blur-[4px] border-b-4 border-[#111] text-[#111] px-6 py-5 font-extrabold uppercase flex flex-wrap gap-4 justify-between shadow-[0_4px_0_#111]">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Your Diaries</h1>
          <p className="text-xs font-bold text-[#111]/70 tracking-widest mt-0.5">
            {diaries.length} {diaries.length === 1 ? "DIARY" : "DIARIES"} OPENED
          </p>
        </div>
        <motion.button
          type="button"
          onClick={() => setCreating(true)}
          className="vybe-btn px-5 py-2.5 text-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          transition={transitionBouncy}
        >
          {diaries.length === 0 ? "+ Create First Diary" : "+ New Diary"}
        </motion.button>
      </div>

      {diaries.length === 0 ? (
        <div className="max-w-md mx-auto my-16 text-center vybe-card p-8 m-4">
          <p className="text-2xl font-extrabold uppercase mb-2">
            No diaries yet
          </p>
          <p className="font-semibold text-sm text-[#111]/70 mb-6">
            Create your first aesthetic diary to start writing thoughts, sketches, and dropping stickers!
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="vybe-btn py-2.5 px-6"
          >
            Create Diary Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 px-6 pb-16">
          {diaries.map((diary) => (
            <DiaryCard
              key={diary.id}
              diary={diary}
              onDelete={(diaryId) =>
                setDiaries((current) => current.filter((item) => item.id !== diaryId))
              }
              onUpdate={(updatedDiary) =>
                setDiaries((current) =>
                  current.map((item) =>
                    item.id === updatedDiary.id ? updatedDiary : item,
                  ),
                )
              }
            />
          ))}
        </div>
      )}

      {creating && (
        <div
          onClick={closeCreate}
          className="w-screen h-screen bg-[#111]/40 fixed inset-0 backdrop-blur-[4px] flex justify-center items-center z-50 p-4"
        >
          <div
            className="vybe-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-extrabold uppercase">Create your diary</h2>
                <button
                  type="button"
                  onClick={closeCreate}
                  className="w-7 h-7 rounded-full border-2 border-[#111] flex items-center justify-center font-black text-sm bg-white hover:bg-[#F0625A] hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="title" className="font-extrabold uppercase text-xs">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  className="vybe-input"
                  placeholder="e.g. Summer Memories, Tokyo 2026"
                  name="title"
                  value={diaryValues.title}
                  onChange={(e) =>
                    setDiaryValues((v) => ({ ...v, title: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="description" className="font-extrabold uppercase text-xs">
                  Description
                </label>
                <input
                  id="description"
                  type="text"
                  className="vybe-input"
                  placeholder="Short summary or aesthetic vibe"
                  name="description"
                  value={diaryValues.description}
                  onChange={(e) =>
                    setDiaryValues((v) => ({ ...v, description: e.target.value }))
                  }
                />
              </div>

              <ColorPicker
                label="Theme color"
                value={diaryValues.theme_color}
                onChange={(color) =>
                  setDiaryValues((v) => ({ ...v, theme_color: color }))
                }
              />

              <div className="flex flex-col gap-1">
                <label htmlFor="cover" className="font-extrabold uppercase text-xs">
                  Diary Wallpaper / Cover Image (Optional)
                </label>
                <input
                  id="cover"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                  className="font-semibold text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-2 file:border-[#111] file:bg-[#FAF8F5] file:font-extrabold file:uppercase file:cursor-pointer"
                />
                <p className="text-[10px] font-bold text-[#111]/60 uppercase mt-0.5">
                  Set a unique background wallpaper specifically for this diary
                </p>
              </div>

              <motion.button
                type="submit"
                disabled={submitting}
                className="vybe-btn py-3 mt-2"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={transitionBouncy}
              >
                {submitting ? "Creating..." : "Create Diary"}
              </motion.button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
