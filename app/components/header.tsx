"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { getProfile } from "@/app/actions/getProfile";
import InsightsModal from "@/app/components/insights-modal";
import { getAvatarUrl, getContrastTextColor } from "@/lib/default-avatars";
import { transitionBouncy } from "@/lib/motion";
import type { Profile } from "@/lib/types";

interface HeaderProps {
  initialProfile?: Profile | null;
}

export default function Header({ initialProfile }: HeaderProps = {}) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(initialProfile || null);
  const [headerColor, setHeaderColor] = useState<string>(
    initialProfile?.header_color || "#F0625A"
  );
  const [avatarSrc, setAvatarSrc] = useState<string>(
    initialProfile ? getAvatarUrl(initialProfile.avatar_url, initialProfile.username) : ""
  );
  const [loading, setLoading] = useState(!initialProfile);
  const [showInsights, setShowInsights] = useState(false);

  const applyColorTheme = (color: string) => {
    setHeaderColor(color);
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--vybe-theme", color);
      const textColor = getContrastTextColor(color);
      document.documentElement.style.setProperty("--vybe-theme-text", textColor);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Apply color from initialProfile or localStorage
    const savedLocalColor = localStorage.getItem("vybe_header_color");
    if (savedLocalColor) {
      applyColorTheme(savedLocalColor);
    } else if (initialProfile?.header_color) {
      applyColorTheme(initialProfile.header_color);
    }

    const handleColorUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string; color: string }>;
      if (!customEvent.detail.key || customEvent.detail.key === "vybe_header_color") {
        applyColorTheme(customEvent.detail.color);
      }
    };

    window.addEventListener("vybe_color_update", handleColorUpdate);

    // If initialProfile was provided, persist to cache and skip server action
    if (initialProfile) {
      setProfile(initialProfile);
      setAvatarSrc(getAvatarUrl(initialProfile.avatar_url, initialProfile.username));
      if (initialProfile.header_color) applyColorTheme(initialProfile.header_color);
      try {
        localStorage.setItem("vybe_profile_cache", JSON.stringify(initialProfile));
      } catch {}
      setLoading(false);
      return () => {
        isMounted = false;
        window.removeEventListener("vybe_color_update", handleColorUpdate);
      };
    }

    // 1. Instant: load profile from localStorage cache (0ms)
    try {
      const cachedProfile = localStorage.getItem("vybe_profile_cache");
      if (cachedProfile && isMounted) {
        const data = JSON.parse(cachedProfile) as Profile;
        setProfile(data);
        setAvatarSrc(getAvatarUrl(data?.avatar_url, data?.username));
        if (data?.header_color) {
          applyColorTheme(data.header_color);
        }
        setLoading(false);
        return () => {
          isMounted = false;
          window.removeEventListener("vybe_color_update", handleColorUpdate);
        };
      }
    } catch {}

    // 2. Background: fetch profile from server only if no cache or initial profile exists
    async function loadUser() {
      try {
        const data = await getProfile();
        if (isMounted && data) {
          setProfile(data);
          setAvatarSrc(getAvatarUrl(data.avatar_url, data.username));
          if (data.header_color) {
            applyColorTheme(data.header_color);
            localStorage.setItem("vybe_header_color", data.header_color);
          }
          localStorage.setItem("vybe_profile_cache", JSON.stringify(data));
        }
      } catch {
        if (isMounted) router.replace("/login");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUser();
    return () => {
      isMounted = false;
      window.removeEventListener("vybe_color_update", handleColorUpdate);
    };
  }, [initialProfile, router]);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Logged out");
    router.push("/login");
  }

  const effectiveAvatar = avatarSrc || getAvatarUrl(null, profile?.username);

  return (
    <>
      <div
        className="w-full px-6 py-4 border-b-4 border-[#111] flex justify-between items-center gap-4 transition-colors duration-200"
        style={{ backgroundColor: headerColor }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setShowInsights(true)}
            className="flex items-center gap-3 cursor-pointer group text-left outline-none"
            title="Click to view creator insights & stats"
          >
            <div className="w-12 h-12 rounded-full border-[3px] border-[#111] overflow-hidden bg-[#FAF8F5] shrink-0 group-hover:scale-105 transition-transform shadow-[2px_2px_0px_#111] flex items-center justify-center">
              <img
                src={effectiveAvatar}
                alt=""
                onError={() => setAvatarSrc(getAvatarUrl(null, profile?.username))}
                className="w-full h-full object-cover select-none"
                draggable={false}
              />
            </div>
            <div className="flex flex-col hidden min-[420px]:block">
              <p className="font-extrabold uppercase tracking-wide truncate text-[#111] group-hover:underline">
                {loading ? "Loading..." : `Hi ${profile?.username || "there"}!`}
              </p>
              <span className="text-[10px] font-black uppercase text-[#111]/80 tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse inline-block" />
                View Stats
              </span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} transition={transitionBouncy}>
            <Link href="/dashboard" prefetch={false} className="vybe-btn vybe-btn-ink inline-block px-3 py-2 text-xs">
              Diaries
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} transition={transitionBouncy}>
            <Link href="/settings" prefetch={false} className="vybe-btn vybe-btn-teal inline-block px-3 py-2 text-xs">
              Settings
            </Link>
          </motion.div>
          <motion.button
            type="button"
            className="vybe-btn vybe-btn-ink px-3 py-2 text-xs"
            onClick={logout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            transition={transitionBouncy}
          >
            Log out
          </motion.button>
        </div>
      </div>

      <InsightsModal isOpen={showInsights} onClose={() => setShowInsights(false)} />
    </>
  );
}
