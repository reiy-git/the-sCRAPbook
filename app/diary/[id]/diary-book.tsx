"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Header from "@/app/components/header";
import { CollageSticker } from "@/app/components/collage-sticker";
import { addEntry, deleteEntry, editEntry } from "@/app/actions/entryActions";
import { editDiary } from "@/app/actions/editDiary";
import { uploadImage } from "@/lib/supabase/storage";
import { transitionBouncy, transitionSmooth } from "@/lib/motion";
import type { Diary, DiaryEntry, Sticker } from "@/lib/types";

const svgDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

// Transparent vector stickers with fully URL-encoded SVG data.
const PRESET_STICKERS: { id: string; label: string; url: string }[] = [
  {
    id: "preset-star",
    label: "3D Star",
    url: svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="m50 5 14 31 34 1-27 21 10 34-31-19-31 19 10-34L2 37l34-1Z" fill="#FACC15" stroke="#111" stroke-width="5" stroke-linejoin="round"/></svg>`),
  },
  {
    id: "preset-heart",
    label: "Chrome Heart",
    url: svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 88S9 61 9 30c0-21 27-27 41-8 14-19 41-13 41 8 0 31-41 58-41 58Z" fill="#F0625A" stroke="#111" stroke-width="5" stroke-linejoin="round"/><path d="M25 31q8-12 18-5" fill="none" stroke="#FAF8F5" stroke-width="4" stroke-linecap="round"/></svg>`),
  },
  {
    id: "preset-lightning",
    label: "Acid Bolt",
    url: svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="m56 4-38 51h29l-7 41 42-53H53Z" fill="#A3E635" stroke="#111" stroke-width="5" stroke-linejoin="round"/></svg>`),
  },
  {
    id: "preset-butterfly",
    label: "Y2K Fly",
    url: svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 53C28 13 3 27 14 58c7 20 26 11 36-1 10 12 29 21 36 1 11-31-14-45-36-5Z" fill="#C084FC" stroke="#111" stroke-width="4"/><path d="M50 47v18" stroke="#111" stroke-width="5" stroke-linecap="round"/></svg>`),
  },
  {
    id: "preset-disc",
    label: "Vinyl Record",
    url: svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="43" fill="#111" stroke="#14B8A6" stroke-width="5"/><circle cx="50" cy="50" r="24" fill="#F0625A" stroke="#111" stroke-width="4"/><circle cx="50" cy="50" r="8" fill="#FAF8F5" stroke="#111" stroke-width="3"/></svg>`),
  },
];

const isLegacyPresetUrl = (url: string) => url.startsWith("data:image/svg+xml;base64,");
const resolveStickerUrl = (url: string) =>
  isLegacyPresetUrl(url) ? PRESET_STICKERS[0].url : url;

interface PageState {
  id?: string;
  title: string;
  content: string;
  stickers: Sticker[];
}

function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const shortYear = String(year).slice(-2);
  return `${month}/${day}/${shortYear}`;
}

function formatLongDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function addDays(baseDateStr: string, days: number): string {
  const [y, m, d] = baseDateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

function hexToRgba(hex: string, alpha: number): string {
  let c = (hex || "").replace("#", "").trim();
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const num = parseInt(c, 16);
  if (isNaN(num) || c.length !== 6) return `rgba(250, 248, 245, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function safeLocalStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("LocalStorage set skipped (quota):", e);
  }
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DiaryBook({
  diaryId,
  initialDiary,
  initialEntries,
}: {
  diaryId: string;
  initialDiary: Diary | null;
  initialEntries: DiaryEntry[];
}) {
  const [diary] = useState<Diary | null>(initialDiary);
  const [savedStickers, setSavedStickers] = useState<{ id: string; url: string; label: string }[]>(
    PRESET_STICKERS,
  );

  // SSR-safe: use a fixed empty string, fill in on useEffect (avoids Date.now() hydration mismatch)
  const [leftDate, setLeftDate] = useState<string>("");

  // Right date is always consecutive: leftDate + 1 day
  const rightDate = leftDate ? addDays(leftDate, 1) : "";

  // Master client-side dictionary for all pages
  const [pagesRecord, setPagesRecord] = useState<Record<string, PageState>>(() => {
    const initialMap: Record<string, PageState> = {};
    initialEntries.forEach((e) => {
      initialMap[e.entry_date] = {
        id: e.id,
        title: e.title || "",
        content: e.content || "",
        stickers: Array.isArray(e.stickers_json)
          ? e.stickers_json.map((sticker) => ({
              ...sticker,
              url: resolveStickerUrl(sticker.url),
            }))
          : [],
      };
    });
    return initialMap;
  });

  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [direction, setDirection] = useState<number>(0);

  // Diary-specific wallpaper
  const [diaryWallpaper, setDiaryWallpaper] = useState<string | null>(
    initialDiary?.cover_image_url || null,
  );

  // Calendar Dropdown Navigation State
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => new Date());
  const calendarDropdownRef = useRef<HTMLDivElement>(null);

  const leftPageRef = useRef<HTMLDivElement>(null);
  const rightPageRef = useRef<HTMLDivElement>(null);

  // Set document title dynamically
  useEffect(() => {
    if (typeof document !== "undefined" && diary?.title) {
      document.title = `${diary.title} — the sCRAPbook`;
    }
  }, [diary?.title]);

  useEffect(() => {
    // Set today's date on client side only (if not already set)
    setLeftDate((prev) => {
      if (!prev) {
        const today = new Date();
        setCalendarViewDate(today);
        return formatDateKey(today);
      }
      return prev;
    });

    // Merge localStorage draft onto server data
    try {
      const localDraft = localStorage.getItem(`vybe_diary_draft_${diaryId}`);
      if (localDraft) {
        const parsed = JSON.parse(localDraft) as Record<string, Partial<PageState>>;
        setPagesRecord((prev) => {
          const merged = { ...prev };
          Object.keys(parsed).forEach((k) => {
            merged[k] = {
              ...merged[k],
              ...parsed[k],
              stickers: (parsed[k].stickers || merged[k]?.stickers || []).map((sticker) => ({
                ...sticker,
                url: resolveStickerUrl(sticker.url),
              })),
            };
          });
          return merged;
        });
      }
    } catch (err) {
      console.error("Failed to parse local draft", err);
    }

    // Load diary-specific wallpaper or fallback to global wallpaper
    try {
      const localDiaryWp = localStorage.getItem(`vybe_diary_wp_${diaryId}`);
      if (localDiaryWp && !localDiaryWp.startsWith("data:")) {
        setDiaryWallpaper(localDiaryWp);
      } else if (initialDiary?.cover_image_url) {
        setDiaryWallpaper(initialDiary.cover_image_url);
      } else {
        const localWp = localStorage.getItem("vybe_wallpaper_url");
        if (localWp && !localWp.startsWith("data:")) setDiaryWallpaper(localWp);
      }
    } catch { }
  }, [diaryId, initialDiary]);

  // Click outside to close calendar dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarDropdownRef.current &&
        !calendarDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    };
    if (showCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCalendar]);

  // Load saved stickers from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("vybe_saved_stickers");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const migrated = parsed.map((sticker) => {
            const preset = PRESET_STICKERS.find((item) => item.id === sticker.id);
            return preset || { ...sticker, url: resolveStickerUrl(sticker.url) };
          });
          setSavedStickers(migrated);
          safeLocalStorageSet("vybe_saved_stickers", JSON.stringify(migrated));
          return;
        }
      }
      setSavedStickers(PRESET_STICKERS);
    } catch (err) {
      console.error("Failed loading saved stickers:", err);
      setSavedStickers(PRESET_STICKERS);
    }
  }, []);

  // Keyboard navigation for ultra-fast flipping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") {
        return;
      }
      if (e.key === "ArrowLeft") {
        setDirection(-1);
        setLeftDate((prev) => addDays(prev, -1));
      } else if (e.key === "ArrowRight") {
        setDirection(1);
        setLeftDate((prev) => addDays(prev, 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Compute all dates with written entries/stickers for the calendar badges
  const entryDatesWithData = useMemo(() => {
    return Object.entries(pagesRecord)
      .filter(([_, state]) =>
        Boolean(state.title?.trim() || state.content?.trim() || state.stickers?.length > 0),
      )
      .map(([dateKey, state]) => ({
        dateKey,
        title: state.title?.trim() || "Untitled entry",
        hasStickers: Boolean(state.stickers?.length > 0),
        stickerCount: state.stickers?.length || 0,
      }))
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [pagesRecord]);

  const entryDatesSet = useMemo(() => {
    return new Set(entryDatesWithData.map((e) => e.dateKey));
  }, [entryDatesWithData]);

  // Helper to get state for any date
  const getPageState = useCallback(
    (dateStr: string): PageState => {
      return (
        pagesRecord[dateStr] || {
          title: "",
          content: "",
          stickers: [],
        }
      );
    },
    [pagesRecord],
  );

  const leftState = getPageState(leftDate);
  const rightState = getPageState(rightDate);

  // Update page field in client state (0ms latency)
  const updatePage = useCallback(
    (dateStr: string, updates: Partial<PageState>) => {
      setPagesRecord((prev) => {
        const current = prev[dateStr] || {
          title: "",
          content: "",
          stickers: [],
        };
        const updated = {
          ...prev,
          [dateStr]: {
            ...current,
            ...updates,
          },
        };

        // Cache in localStorage safely
        safeLocalStorageSet(
          `vybe_diary_draft_${diaryId}`,
          JSON.stringify(updated),
        );
        return updated;
      });
    },
    [diaryId],
  );

  // Save specific page to database
  const savePageToDatabase = useCallback(
    async (dateStr: string, showToast = false) => {
      const pageData = pagesRecord[dateStr];
      if (!pageData) return;

      const hasContent =
        pageData.title.trim() !== "" ||
        pageData.content.trim() !== "" ||
        pageData.stickers.length > 0;

      if (!hasContent && !pageData.id) {
        return;
      }

      setSavingDate(dateStr);
      try {
        const titleToSave = pageData.title.trim();
        const contentToSave = pageData.content;
        const stickersToSave = pageData.stickers || [];

        if (pageData.id) {
          await editEntry(
            diaryId,
            pageData.id,
            titleToSave,
            contentToSave,
            stickersToSave,
          );
        } else {
          const newId = await addEntry(diaryId, titleToSave, contentToSave, dateStr);
          updatePage(dateStr, { id: newId });
        }

        if (showToast) {
          toast.success(`Saved page for ${formatDisplayDate(dateStr)}`);
        }
      } catch (err) {
        console.error("Error saving page:", err);
        if (showToast) {
          toast.error(err instanceof Error ? err.message : "Save failed");
        }
      } finally {
        setSavingDate(null);
      }
    },
    [diaryId, pagesRecord, updatePage],
  );

  // Keep track of the last saved state to avoid redundant saves
  const lastSavedLeft = useRef<string | null>(null);
  const lastSavedRight = useRef<string | null>(null);

  // Debounced auto-save
  useEffect(() => {
    const currentLeftStr = JSON.stringify({ t: leftState.title, c: leftState.content, s: leftState.stickers });
    const currentRightStr = JSON.stringify({ t: rightState.title, c: rightState.content, s: rightState.stickers });

    // Initialize refs on first render to avoid mount-save
    if (lastSavedLeft.current === null) lastSavedLeft.current = currentLeftStr;
    if (lastSavedRight.current === null) lastSavedRight.current = currentRightStr;

    const timer = setTimeout(() => {
      const leftHasData = leftState.title || leftState.content || leftState.stickers.length > 0;
      if (leftHasData && currentLeftStr !== lastSavedLeft.current) {
        savePageToDatabase(leftDate, false).then(() => {
          lastSavedLeft.current = currentLeftStr;
        });
      }

      const rightHasData = rightState.title || rightState.content || rightState.stickers.length > 0;
      if (rightHasData && currentRightStr !== lastSavedRight.current) {
        savePageToDatabase(rightDate, false).then(() => {
          lastSavedRight.current = currentRightStr;
        });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [leftState.title, leftState.content, leftState.stickers, rightState.title, rightState.content, rightState.stickers, leftDate, rightDate, savePageToDatabase]);

  // Single-day pagination step:
  const handlePrevious = () => {
    setDirection(-1);
    setLeftDate((prev) => addDays(prev, -1));
  };

  const handleNext = () => {
    setDirection(1);
    setLeftDate((prev) => addDays(prev, 1));
  };

  // Jump to selected calendar date
  const handleJumpToDate = (targetDateStr: string) => {
    setDirection(targetDateStr >= leftDate ? 1 : -1);
    setLeftDate(targetDateStr);
    setShowCalendar(false);
    toast.success(`Jumped to ${formatDisplayDate(targetDateStr)}`);
  };

  // Delete page
  const handleDeletePage = async (dateStr: string) => {
    const pageData = pagesRecord[dateStr];
    if (pageData?.id) {
      try {
        await deleteEntry(diaryId, pageData.id);
        toast.success(`Page for ${formatDisplayDate(dateStr)} deleted`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
        return;
      }
    } else {
      toast.success("Page cleared");
    }

    updatePage(dateStr, {
      id: undefined,
      title: "",
      content: "",
      stickers: [],
    });
  };

  // Upload wallpaper specifically for this diary (Quota-safe with instant object URL)
  const handleDiaryWallpaperUpload = async (file: File) => {
    // 1. Instant preview without large base64 strings in localStorage
    const blobUrl = URL.createObjectURL(file);
    setDiaryWallpaper(blobUrl);
    toast.success("Diary wallpaper updated!");

    // 2. Upload to Supabase Storage in background
    try {
      const publicUrl = await uploadImage(file, "wallpapers");
      setDiaryWallpaper(publicUrl);
      safeLocalStorageSet(`vybe_diary_wp_${diaryId}`, publicUrl);
      if (diary) {
        await editDiary(
          diaryId,
          diary.title,
          diary.description || "",
          publicUrl,
          diary.theme_color || undefined,
        );
      }
    } catch (err) {
      console.warn("Storage sync notice:", err);
    }
  };

  const handleRemoveDiaryWallpaper = async () => {
    setDiaryWallpaper(null);
    try {
      localStorage.removeItem(`vybe_diary_wp_${diaryId}`);
    } catch { }
    if (diary) {
      try {
        await editDiary(
          diaryId,
          diary.title,
          diary.description || "",
          null,
          diary.theme_color || undefined,
        );
      } catch { }
    }
    toast.success("Diary wallpaper removed");
  };

  // Optimistic client-first sticker upload (Quota-safe with instant object URL)
  const handleUploadNewSticker = async (file: File) => {
    const blobUrl = URL.createObjectURL(file);
    const tempId = crypto.randomUUID();
    const newStickerItem = {
      id: tempId,
      url: blobUrl,
      label: file.name.slice(0, 8),
    };

    const updatedList = [...savedStickers, newStickerItem];
    setSavedStickers(updatedList);
    toast.success("Sticker ready! Drag onto page.");

    try {
      const publicUrl = await uploadImage(file, "entry-images");
      setSavedStickers((prev) => {
        const synced = prev.map((s) =>
          s.id === tempId ? { ...s, url: publicUrl } : s,
        );
        safeLocalStorageSet("vybe_saved_stickers", JSON.stringify(synced));
        return synced;
      });
    } catch (uploadErr) {
      console.warn("Storage sync fallback:", uploadErr);
    }
  };

  // Delete sticker from top shelf
  const handleDeleteSavedSticker = (stickerId: string) => {
    const updated = savedStickers.filter((s) => s.id !== stickerId);
    setSavedStickers(updated);
    safeLocalStorageSet("vybe_saved_stickers", JSON.stringify(updated));
    toast.success("Sticker removed from shelf");
  };

  // Reset default preset stickers
  const handleResetDefaultStickers = () => {
    setSavedStickers(PRESET_STICKERS);
    safeLocalStorageSet("vybe_saved_stickers", JSON.stringify(PRESET_STICKERS));
    toast.success("Default stickers restored!");
  };

  // Drop sticker onto the full diary page
  const handleDropOnPage = (
    e: React.DragEvent<HTMLDivElement>,
    dateStr: string,
    isRight: boolean,
  ) => {
    e.preventDefault();
    const stickerUrl =
      e.dataTransfer.getData("application/vybe-sticker") ||
      e.dataTransfer.getData("text/plain");

    if (!stickerUrl) return;

    const pageContainer = isRight ? rightPageRef.current : leftPageRef.current;
    let dropX = 40;
    let dropY = 90;

    if (pageContainer) {
      const rect = pageContainer.getBoundingClientRect();
      dropX = Math.max(0, Math.min(rect.width - 100, e.clientX - rect.left - 50));
      dropY = Math.max(0, Math.min(rect.height - 100, e.clientY - rect.top - 50));
    }

    const currentStickers = getPageState(dateStr).stickers || [];
    const newSticker: Sticker = {
      id: crypto.randomUUID(),
      url: stickerUrl,
      x: dropX,
      y: dropY,
      scale: 1,
      rotate: 0,
      zIndex: currentStickers.length + 1,
    };

    updatePage(dateStr, {
      stickers: [...currentStickers, newSticker],
    });

    toast.success("Sticker placed on page!");
  };

  // Update sticker on client immediately
  const handleUpdateSticker = (
    dateStr: string,
    stickerId: string,
    updates: Partial<Sticker>,
  ) => {
    const currentStickers = getPageState(dateStr).stickers || [];
    const updated = currentStickers.map((s) =>
      s.id === stickerId ? { ...s, ...updates } : s,
    );
    updatePage(dateStr, { stickers: updated });
  };

  // Layer change handler: move behind previous sticker or above next sticker
  const handleLayerChange = (
    dateStr: string,
    stickerId: string,
    action: "behind" | "above" | "bottom" | "top",
  ) => {
    const currentStickers = getPageState(dateStr).stickers || [];
    const index = currentStickers.findIndex((s) => s.id === stickerId);
    if (index === -1) return;

    let updated = [...currentStickers];
    const target = updated[index];

    if (action === "behind") {
      if (index > 0) {
        updated[index] = updated[index - 1];
        updated[index - 1] = target;
      }
    } else if (action === "above") {
      if (index < updated.length - 1) {
        updated[index] = updated[index + 1];
        updated[index + 1] = target;
      }
    } else if (action === "bottom") {
      updated = [target, ...updated.filter((s) => s.id !== stickerId)];
    } else if (action === "top") {
      updated = [...updated.filter((s) => s.id !== stickerId), target];
    }

    const normalized = updated.map((stk, idx) => ({
      ...stk,
      zIndex: idx + 1,
    }));

    updatePage(dateStr, { stickers: normalized });
    toast.success(
      action === "behind"
        ? "Moved behind"
        : action === "above"
          ? "Moved above"
          : action === "bottom"
            ? "Sent to back"
            : "Brought to front",
    );
  };

  // Delete sticker from page
  const handleDeleteSticker = (dateStr: string, stickerId: string) => {
    const currentStickers = getPageState(dateStr).stickers || [];
    const updated = currentStickers.filter((s) => s.id !== stickerId);
    updatePage(dateStr, { stickers: updated });
  };

  // Click sticker from shelf to drop on right page
  const handleStickerClick = (url: string) => {
    const targetDate = rightDate;
    const currentStickers = getPageState(targetDate).stickers || [];
    const newSticker: Sticker = {
      id: crypto.randomUUID(),
      url,
      x: 30 + Math.random() * 120,
      y: 90 + Math.random() * 120,
      scale: 1,
      rotate: Math.floor(Math.random() * 20) - 10,
      zIndex: currentStickers.length + 1,
    };

    updatePage(targetDate, {
      stickers: [...currentStickers, newSticker],
    });
    toast.success(`Sticker placed on ${formatDisplayDate(targetDate)}!`);
  };

  // Calendar calculations
  const calYear = calendarViewDate.getFullYear();
  const calMonth = calendarViewDate.getMonth();
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const daysInCalMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calMonthTitle = calendarViewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  if (!diary) {
    return (
      <div className="min-h-screen bg-grid-pattern grid place-items-center font-extrabold uppercase">
        <div className="vybe-card p-8 text-center">
          <p className="text-xl mb-4">Diary not found</p>
          <Link href="/dashboard" prefetch={false} className="vybe-btn px-4 py-2">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const diaryTint = diary.theme_color || "#FAF8F5";

  return (
    <div
      className="min-h-screen pb-16 flex flex-col transition-all duration-300"
      style={
        diaryWallpaper
          ? {
            backgroundColor: diaryTint,
            backgroundImage: `linear-gradient(${hexToRgba(diaryTint, 0.45)}, ${hexToRgba(diaryTint, 0.65)}), url(${diaryWallpaper})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
          }
          : {
            backgroundColor: diaryTint,
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(17, 17, 17, 0.04) 0, rgba(17, 17, 17, 0.04) 1px, transparent 1px, transparent 40px)",
          }
      }
    >
      <Header />

      {/* TOP CONTROL BAR */}
      <div className="w-full bg-[#FAF8F5] border-b-4 border-[#111] px-4 py-3 shadow-[0_4px_0_#111]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Back & Title Box */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard"
              prefetch={false}
              className="vybe-btn vybe-btn-ink px-3 py-2 text-xs flex items-center justify-center font-black"
              title="Back to Diaries"
            >
              ←
            </Link>
            <div className="border-3 border-[#111] bg-white px-3 py-2 rounded-xl font-extrabold uppercase text-sm shadow-[2px_2px_0px_#111] truncate max-w-[160px] sm:max-w-xs">
              {diary.title}
            </div>
          </div>

          {/* Calendar Dropdown Navigation (Floating Overlay) */}
          <div className="relative shrink-0" ref={calendarDropdownRef}>
            <button
              type="button"
              onClick={() => setShowCalendar((prev) => !prev)}
              className="vybe-btn vybe-btn-ink px-3 py-2 text-xs flex items-center gap-1.5 font-extrabold shadow-[2px_2px_0px_#111] cursor-pointer"
              title="Open Entry Calendar Navigator"
            >
              <span>📅</span>
              <span>{leftDate ? formatDisplayDate(leftDate) : "Calendar"}</span>
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {entryDatesSet.size} {entryDatesSet.size === 1 ? "entry" : "entries"}
              </span>
              <span className="text-[10px] ml-0.5">{showCalendar ? "▲" : "▼"}</span>
            </button>

            {/* Floating Dropdown Calendar Menu */}
            <AnimatePresence>
              {showCalendar && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={transitionBouncy}
                  className="absolute top-full left-0 mt-2 z-50 w-80 sm:w-92 bg-[#FAF8F5] border-4 border-[#111] rounded-2xl p-4 shadow-[8px_8px_0px_#111]"
                >
                  {/* Calendar Month Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-[#111]">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setCalendarViewDate(
                            new Date(calYear, calMonth - 1, 1),
                          )
                        }
                        className="w-7 h-7 rounded-lg border-2 border-[#111] bg-white hover:bg-[#111] hover:text-white font-black text-xs flex items-center justify-center cursor-pointer transition-colors"
                        title="Previous Month"
                      >
                        ❮
                      </button>
                      <div className="flex gap-1 px-1">
                        <select
                          value={calMonth}
                          onChange={(e) => setCalendarViewDate(new Date(calYear, parseInt(e.target.value), 1))}
                          className="font-black uppercase text-sm bg-transparent border-none outline-none cursor-pointer appearance-none hover:bg-black/5 rounded px-1 text-[#111]"
                        >
                          {Array.from({ length: 12 }).map((_, i) => (
                            <option key={i} value={i} className="bg-white text-black font-sans">
                              {new Date(calYear, i, 1).toLocaleDateString("en-US", { month: "short" })}
                            </option>
                          ))}
                        </select>
                        <select
                          value={calYear}
                          onChange={(e) => setCalendarViewDate(new Date(parseInt(e.target.value), calMonth, 1))}
                          className="font-black uppercase text-sm bg-transparent border-none outline-none cursor-pointer appearance-none hover:bg-black/5 rounded px-1 text-[#111]"
                        >
                          {Array.from({ length: 200 }).map((_, i) => {
                            const y = new Date().getFullYear() - 100 + i; // 20 years past to 20 years future
                            return (
                              <option key={y} value={y} className="bg-white text-black font-sans">
                                {y}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCalendarViewDate(
                            new Date(calYear, calMonth + 1, 1),
                          )
                        }
                        className="w-7 h-7 rounded-lg border-2 border-[#111] bg-white hover:bg-[#111] hover:text-white font-black text-xs flex items-center justify-center cursor-pointer transition-colors"
                        title="Next Month"
                      >
                        ❯
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        today.setDate(today.getDate() - 1);
                        setCalendarViewDate(today);
                        handleJumpToDate(formatDateKey(today));
                      }}
                      className="text-[10px] font-black uppercase px-2 py-1 bg-white border border-[#111] rounded-md hover:bg-black hover:text-white transition-colors"
                    >
                      Today
                    </button>
                  </div>

                  {/* Weekday Labels */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {WEEKDAYS.map((wd) => (
                      <span
                        key={wd}
                        className="font-extrabold text-[10px] uppercase text-[#111]/60 py-0.5"
                      >
                        {wd}
                      </span>
                    ))}
                  </div>

                  {/* Month Days Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-8" />
                    ))}

                    {Array.from({ length: daysInCalMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                      const hasEntry = entryDatesSet.has(dateKey);
                      const isCurrentSpread =
                        dateKey === leftDate || dateKey === rightDate;

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() => handleJumpToDate(dateKey)}
                          className={`h-8 rounded-lg font-black text-xs relative flex flex-col items-center justify-center cursor-pointer transition-all border ${isCurrentSpread
                            ? "border-2 border-[#111] ring-2 ring-[#111] font-black scale-105"
                            : "border-transparent hover:border-[#111]"
                            } ${hasEntry
                              ? "bg-white text-[#111] border-[#111] shadow-[2px_2px_0px_#111] font-black ring-1 ring-[#111]"
                              : "hover:bg-white text-[#111]/80"
                            }`}
                          title={`${dateKey}${hasEntry ? " (Has notes/stickers)" : ""}`}
                        >
                          <span>{dayNum}</span>
                          {hasEntry && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] -mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Recent Entries Quick List */}
                  {entryDatesWithData.length > 0 && (
                    <div className="mt-3 pt-3 border-t-2 border-[#111]">
                      <span className="font-extrabold uppercase text-[10px] text-[#111]/70 block mb-1.5">
                        Recent Entries in Diary:
                      </span>
                      <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
                        {entryDatesWithData.slice(0, 4).map((entry) => (
                          <button
                            key={entry.dateKey}
                            type="button"
                            onClick={() => handleJumpToDate(entry.dateKey)}
                            className="flex items-center justify-between text-left px-2 py-1 bg-white hover:bg-white/80 border border-[#111] rounded-lg transition-colors cursor-pointer group"
                          >
                            <span className="font-extrabold text-xs text-[#111] group-hover:underline truncate max-w-[170px]">
                              {entry.title}
                            </span>
                            <span className="font-bold text-[10px] text-[#111]/60 shrink-0 ml-1">
                              {formatDisplayDate(entry.dateKey)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Wallpaper Option for this Diary */}
          <div className="flex items-center gap-1.5 shrink-0">
            <label
              className="vybe-btn vybe-btn-ink px-3 py-2 text-xs cursor-pointer flex items-center gap-1 font-bold"
              title="Set custom background wallpaper for this diary"
            >
              <span>Wallpaper</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleDiaryWallpaperUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
            {diaryWallpaper && (
              <button
                type="button"
                onClick={handleRemoveDiaryWallpaper}
                className="w-8 h-8 rounded-lg border-2 border-[#111] bg-white hover:bg-[#EF4444] hover:text-white font-black text-xs flex items-center justify-center cursor-pointer transition-colors shadow-[1px_1px_0px_#111]"
                title="Remove custom diary wallpaper"
              >
                ✕
              </button>
            )}
          </div>

          {/* Add Sticker Button */}
          <label className="vybe-btn px-3.5 py-2 text-xs cursor-pointer flex items-center gap-1.5 shrink-0 justify-center font-black">
            + Add PNG Sticker
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadNewSticker(file);
                e.target.value = "";
              }}
            />
          </label>

          {/* Saved Stickers Shelf with Delete & Reset */}
          <div className="flex-1 bg-white/80 border-3 border-[#111] rounded-xl p-1.5 flex items-center gap-2 overflow-x-auto shadow-[2px_2px_0px_#111] min-h-[58px]">
            <div className="flex items-center gap-1.5 shrink-0 px-1.5">
              <span className="font-extrabold uppercase text-[10px] text-[#111]/70 tracking-wider">
                Saved Stickers:
              </span>
              <button
                type="button"
                onClick={handleResetDefaultStickers}
                className="text-[9px] font-black uppercase text-[#111]/60 hover:text-[#111] underline px-1 cursor-pointer"
                title="Restore default streetwear stickers"
              >
                + Defaults
              </button>
            </div>

            {savedStickers.map((stk) => (
              <div
                key={stk.id}
                className="w-12 h-12 shrink-0 relative group"
                title={`${stk.label} (Drag onto page or click to place)`}
              >
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/vybe-sticker", stk.url);
                    e.dataTransfer.setData("text/plain", stk.url);
                  }}
                  onClick={() => handleStickerClick(stk.url)}
                  className="w-full h-full cursor-grab active:cursor-grabbing hover:scale-115 hover:drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)] transition-transform flex items-center justify-center select-none p-1"
                >
                  <img
                    src={stk.url}
                    alt={stk.label}
                    className="w-full h-full object-contain pointer-events-none select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                    draggable={false}
                  />
                </div>
                {/* Delete saved sticker from shelf button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSavedSticker(stk.id);
                  }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#EF4444] text-white text-xs font-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-[#111] shadow-[1px_1px_0px_#111] cursor-pointer hover:scale-115"
                  title={`Delete ${stk.label} from shelf`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN 2-PAGE NOTEBOOK SPREAD & CAROUSEL */}
      <div className="max-w-7xl w-full mx-auto px-2 sm:px-4 py-8 flex-1 flex items-center justify-center relative">
        {/* Floating Carousel Previous Button */}
        <motion.button
          type="button"
          onClick={handlePrevious}
          className="absolute left-1 sm:left-4 z-40 vybe-btn vybe-btn-ink w-12 h-14 sm:w-14 sm:h-16 flex flex-col items-center justify-center font-black text-xl shadow-[4px_4px_0px_#111]"
          whileHover={{ scale: 1.1, x: -3 }}
          whileTap={{ scale: 0.92 }}
          transition={transitionBouncy}
          title="Previous Day (Left arrow key)"
        >
          <span>❮</span>
          <span className="text-[9px] uppercase tracking-tighter -mt-1 font-bold">Prev</span>
        </motion.button>

        {/* Floating Carousel Next Button */}
        <motion.button
          type="button"
          onClick={handleNext}
          className="absolute right-1 sm:right-4 z-40 vybe-btn vybe-btn-ink w-12 h-14 sm:w-14 sm:h-16 flex flex-col items-center justify-center font-black text-xl shadow-[4px_4px_0px_#111]"
          whileHover={{ scale: 1.1, x: 3 }}
          whileTap={{ scale: 0.92 }}
          transition={transitionBouncy}
          title="Next Day (Right arrow key)"
        >
          <span>❯</span>
          <span className="text-[9px] uppercase tracking-tighter -mt-1 font-bold">Next</span>
        </motion.button>

        {/* 2-PAGE NOTEBOOK SPREAD */}
        <div className="w-full max-w-5xl px-8 sm:px-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={leftDate}
              initial={{ opacity: 0, x: direction * 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -25 }}
              transition={transitionSmooth}
              className="relative flex flex-col md:flex-row bg-[#FAF8F5] border-4 border-[#111] rounded-3xl shadow-[12px_12px_0px_#111] overflow-hidden"
            >
              {/* Central Spine Binding */}
              <div className="hidden md:flex absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 z-30 pointer-events-none flex-col justify-between py-6 items-center bg-gradient-to-r from-black/15 via-transparent to-black/15">
                <div className="w-full h-full border-r-2 border-dashed border-[#111]/40" />
              </div>

              {/* LEFT PAGE (Full page sticker canvas bounded to page) */}
              <div
                ref={leftPageRef}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnPage(e, leftDate, false)}
                className="flex-1 flex flex-col border-b-4 md:border-b-0 md:border-r-4 border-[#111] p-5 sm:p-7 relative bg-[#FAF8F5] shadow-[inset_-6px_0_12px_rgba(0,0,0,0.04)]"
              >
                {/* Date Header */}
                <div className="flex justify-between items-center mb-3 relative z-10">
                  <span className="text-xl sm:text-2xl font-black uppercase text-[#111] tracking-tight">
                    {leftDate ? formatDisplayDate(leftDate) : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase text-[#111]/60 tracking-wider hidden sm:inline">
                      {leftDate ? formatLongDate(leftDate) : ""}
                    </span>
                    {savingDate === leftDate && (
                      <span className="text-[10px] font-bold text-[#14B8A6] uppercase animate-pulse">
                        Saving...
                      </span>
                    )}
                  </div>
                </div>

                {/* Title Line */}
                <input
                  type="text"
                  value={leftState.title}
                  onChange={(e) =>
                    updatePage(leftDate, { title: e.target.value })
                  }
                  placeholder="Title..."
                  className="w-full border-b-3 border-[#111] bg-transparent py-1 font-extrabold text-lg sm:text-xl uppercase text-[#111] outline-none placeholder:text-[#111]/30 mb-3 relative z-10"
                />

                {/* Interactive Lined Notes Paper (Unclipped for stickers) */}
                <div
                  className="relative flex-1 min-h-[380px] sm:min-h-[440px] rounded-xl border-2 border-dashed border-[#111]/25 p-3 select-text"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(transparent, transparent 29px, rgba(17, 17, 17, 0.12) 30px)",
                    backgroundAttachment: "local",
                    lineHeight: "30px",
                  }}
                >
                  {/* Notes Textarea */}
                  <textarea
                    value={leftState.content}
                    onChange={(e) =>
                      updatePage(leftDate, { content: e.target.value })
                    }
                    placeholder="Write your notes, memories, or drop stickers here..."
                    className="w-full h-full bg-transparent resize-none outline-none font-semibold text-base text-[#111] relative z-10"
                    style={{ lineHeight: "30px", paddingTop: "2px" }}
                  />
                </div>

                {/* Left Page Bottom Actions */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t-2 border-[#111]/20 relative z-10">
                  <motion.button
                    type="button"
                    onClick={() => handleDeletePage(leftDate)}
                    className="vybe-btn vybe-btn-ink px-4 py-1.5 text-xs"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Delete
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => savePageToDatabase(leftDate, true)}
                    className="vybe-btn px-4 py-1.5 text-xs font-black"
                  >
                    {savingDate === leftDate ? "Saving..." : "Save"}
                  </button>
                </div>

                {/* Full-Page Transparent Stickers Layer */}
                <div className="absolute inset-0 pointer-events-none z-30">
                  {leftState.stickers.map((stk) => (
                    <div key={stk.id} className="pointer-events-auto">
                      <CollageSticker
                        {...stk}
                        maxZIndex={leftState.stickers.length + 20}
                        onUpdate={(id, updates) =>
                          handleUpdateSticker(leftDate, id, updates)
                        }
                        onLayerChange={(id, action) =>
                          handleLayerChange(leftDate, id, action)
                        }
                        onDelete={(id) => handleDeleteSticker(leftDate, id)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT PAGE (Full page sticker canvas bounded to page) */}
              <div
                ref={rightPageRef}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnPage(e, rightDate, true)}
                className="flex-1 flex flex-col p-5 sm:p-7 relative bg-[#FAF8F5] shadow-[inset_6px_0_12px_rgba(0,0,0,0.04)]"
              >
                {/* Date Header */}
                <div className="flex justify-between items-center mb-3 relative z-10">
                  <span className="text-xl sm:text-2xl font-black uppercase text-[#111] tracking-tight">
                    {rightDate ? formatDisplayDate(rightDate) : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase text-[#111]/60 tracking-wider hidden sm:inline">
                      {rightDate ? formatLongDate(rightDate) : ""}
                    </span>
                    {savingDate === rightDate && (
                      <span className="text-[10px] font-bold text-[#14B8A6] uppercase animate-pulse">
                        Saving...
                      </span>
                    )}
                  </div>
                </div>

                {/* Title Line */}
                <input
                  type="text"
                  value={rightState.title}
                  onChange={(e) =>
                    updatePage(rightDate, { title: e.target.value })
                  }
                  placeholder="Title..."
                  className="w-full border-b-3 border-[#111] bg-transparent py-1 font-extrabold text-lg sm:text-xl uppercase text-[#111] outline-none placeholder:text-[#111]/30 mb-3 relative z-10"
                />

                {/* Interactive Lined Notes Paper (Unclipped for stickers) */}
                <div
                  className="relative flex-1 min-h-[380px] sm:min-h-[440px] rounded-xl border-2 border-dashed border-[#111]/25 p-3 select-text"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(transparent, transparent 29px, rgba(17, 17, 17, 0.12) 30px)",
                    backgroundAttachment: "local",
                    lineHeight: "30px",
                  }}
                >
                  {/* Notes Textarea */}
                  <textarea
                    value={rightState.content}
                    onChange={(e) =>
                      updatePage(rightDate, { content: e.target.value })
                    }
                    placeholder="Write your notes, memories, or drop stickers here..."
                    className="w-full h-full bg-transparent resize-none outline-none font-semibold text-base text-[#111] relative z-10"
                    style={{ lineHeight: "30px", paddingTop: "2px" }}
                  />
                </div>

                {/* Right Page Bottom Actions */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t-2 border-[#111]/20 relative z-10">
                  <motion.button
                    type="button"
                    onClick={() => handleDeletePage(rightDate)}
                    className="vybe-btn vybe-btn-ink px-4 py-1.5 text-xs"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Delete
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => savePageToDatabase(rightDate, true)}
                    className="vybe-btn px-4 py-1.5 text-xs font-black"
                  >
                    {savingDate === rightDate ? "Saving..." : "Save"}
                  </button>
                </div>

                {/* Full-Page Transparent Stickers Layer */}
                <div className="absolute inset-0 pointer-events-none z-30">
                  {rightState.stickers.map((stk) => (
                    <div key={stk.id} className="pointer-events-auto">
                      <CollageSticker
                        {...stk}
                        maxZIndex={rightState.stickers.length + 20}
                        onUpdate={(id, updates) =>
                          handleUpdateSticker(rightDate, id, updates)
                        }
                        onLayerChange={(id, action) =>
                          handleLayerChange(rightDate, id, action)
                        }
                        onDelete={(id) => handleDeleteSticker(rightDate, id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
