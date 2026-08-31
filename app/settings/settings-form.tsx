"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Header from "@/app/components/header";
import ColorPicker from "@/app/components/color-picker";
import { updateProfile } from "@/app/actions/updateProfile";
import { updatePassword, deleteAccount } from "@/app/actions/auth";
import { uploadImage } from "@/lib/supabase/storage";
import { DEFAULT_AVATARS, getAvatarUrl, getDefaultAvatar, getContrastTextColor } from "@/lib/default-avatars";
import { transitionBouncy } from "@/lib/motion";
import type { DashboardBackground, Profile } from "@/lib/types";

const WALLPAPERS: { id: DashboardBackground; label: string }[] = [
  { id: "grid-pattern", label: "Grid Pattern" },
  { id: "sand-waves", label: "Sand Waves" },
  { id: "acid-gradient", label: "Acid Gradient" },
];

export default function SettingsForm({ initialProfile }: { initialProfile: Profile | null }) {
  const router = useRouter();

  // Load from cache first for instant hydration — server data wins when available
  const cachedProfile = (() => {
    if (initialProfile) return initialProfile;
    if (typeof window !== "undefined") {
      try {
        const c = localStorage.getItem("vybe_profile_cache");
        return c ? (JSON.parse(c) as Profile) : null;
      } catch {}
    }
    return null;
  })();
  const effectiveProfile = initialProfile ?? cachedProfile;

  const [profile, setProfile] = useState(effectiveProfile);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState(effectiveProfile?.username || "");
  const [headerColor, setHeaderColor] = useState(
    effectiveProfile?.header_color || "#F0625A",
  );
  const [avatarUrl, setAvatarUrl] = useState(
    effectiveProfile?.avatar_url || "",
  );
  const [wallpaper, setWallpaper] = useState<DashboardBackground>(
    effectiveProfile?.dashboard_background || "grid-pattern",
  );
  const [wallpaperImage, setWallpaperImage] = useState<File | null>(null);
  const [wallpaperImageUrl, setWallpaperImageUrl] = useState(
    effectiveProfile?.wallpaper_image_url || "",
  );

  // Track last saved state to avoid redundant network requests & make settings blazing fast
  const lastSavedState = useRef({
    username: effectiveProfile?.username || "",
    headerColor: effectiveProfile?.header_color || "#F0625A",
    avatarUrl: effectiveProfile?.avatar_url || "",
    wallpaper: effectiveProfile?.dashboard_background || ("grid-pattern" as DashboardBackground),
    wallpaperImageUrl: effectiveProfile?.wallpaper_image_url || "",
  });

  // Password Update State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Delete Account Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Settings — the sCRAPbook";
    }
    if (typeof window !== "undefined") {
      // Persist fresh profile to cache for instant next-visit load
      if (initialProfile) {
        try { localStorage.setItem("vybe_profile_cache", JSON.stringify(initialProfile)); } catch {}
      }
      const localColor = localStorage.getItem("vybe_header_color");
      if (localColor && !effectiveProfile?.header_color) {
        setHeaderColor(localColor);
        document.documentElement.style.setProperty("--vybe-theme", localColor);
        document.documentElement.style.setProperty("--vybe-theme-text", getContrastTextColor(localColor));
      }
      const localWp = localStorage.getItem("vybe_wallpaper_url");
      if (localWp && !effectiveProfile?.wallpaper_image_url) {
        setWallpaperImageUrl(localWp);
      }
    }
  }, [initialProfile]);

  const handleColorChange = (newColor: string) => {
    setHeaderColor(newColor);
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--vybe-theme", newColor);
      document.documentElement.style.setProperty("--vybe-theme-text", getContrastTextColor(newColor));
    }
  };

  async function handleSave() {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      toast.error("Username is required");
      return;
    }

    // Check if anything actually changed from last saved state
    const hasChanged =
      trimmedUsername !== lastSavedState.current.username ||
      headerColor !== lastSavedState.current.headerColor ||
      avatarUrl !== lastSavedState.current.avatarUrl ||
      wallpaper !== lastSavedState.current.wallpaper ||
      wallpaperImageUrl !== lastSavedState.current.wallpaperImageUrl ||
      wallpaperImage !== null;

    // Instant client-side persistence
    if (typeof window !== "undefined") {
      localStorage.setItem("vybe_header_color", headerColor);
      localStorage.setItem("vybe_bg_pattern", wallpaper);
      if (wallpaperImageUrl) {
        localStorage.setItem("vybe_wallpaper_url", wallpaperImageUrl);
      } else {
        localStorage.removeItem("vybe_wallpaper_url");
      }
      window.dispatchEvent(
        new CustomEvent("vybe_wallpaper_update", {
          detail: { url: wallpaperImageUrl || null, pattern: wallpaper },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("vybe_color_update", {
          detail: { key: "vybe_header_color", color: headerColor },
        }),
      );
    }

    // If no database fields changed, skip server roundtrip for ultra speed
    if (!hasChanged) {
      toast.success("Settings are already up to date!");
      return;
    }

    setSaving(true);
    try {
      let imageUrl = wallpaperImageUrl;
      if (wallpaperImage) {
        imageUrl = await uploadImage(wallpaperImage, "wallpapers");
        setWallpaperImageUrl(imageUrl);
      }

      await updateProfile({
        username: trimmedUsername,
        header_color: headerColor,
        avatar_url: avatarUrl || null,
        dashboard_background: wallpaper,
        wallpaper_image_url: imageUrl || null,
      });

      // Update baseline state ref
      lastSavedState.current = {
        username: trimmedUsername,
        headerColor,
        avatarUrl,
        wallpaper,
        wallpaperImageUrl: imageUrl,
      };

      setWallpaperImage(null);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              username: trimmedUsername,
              header_color: headerColor,
              avatar_url: avatarUrl || null,
              dashboard_background: wallpaper,
              wallpaper_image_url: imageUrl || null,
            }
          : null,
      );

      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatar(file: File) {
    setSaving(true);
    try {
      const url = await uploadImage(file, "avatars");
      await updateProfile({ avatar_url: url });
      setAvatarUrl(url);
      lastSavedState.current.avatarUrl = url;
      setProfile((p) => (p ? { ...p, avatar_url: url } : p));
      toast.success("Avatar uploaded & saved!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Avatar upload failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSelectDefaultAvatar(presetUrl: string, presetName: string) {
    setAvatarUrl(presetUrl);
    setProfile((p) => (p ? { ...p, avatar_url: presetUrl } : p));
    try {
      await updateProfile({ avatar_url: presetUrl || null });
      lastSavedState.current.avatarUrl = presetUrl;
      toast.success(`Avatar set to ${presetName}!`);
    } catch {
      toast.success(`Selected ${presetName} avatar (click Save to sync)`);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await updatePassword(newPassword);
      if (!res.success) {
        toast.error(res.error || "Failed to update password");
      } else {
        toast.success("Password updated successfully!");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Password update failed");
    } finally {
      setUpdatingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    try {
      const res = await deleteAccount();
      if (!res.success) {
        toast.error(res.error || "Could not delete account");
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.clear();
      }
      toast.success("Your account and all diaries have been deleted.");
      router.push("/signup");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  }

  const effectiveAvatar = getAvatarUrl(avatarUrl, username || profile?.username);

  return (
    <div
      className={`min-h-screen pb-16 ${
        wallpaperImageUrl
          ? "bg-cover bg-center bg-fixed"
          : wallpaper === "sand-waves"
            ? "bg-sand-waves"
            : wallpaper === "acid-gradient"
              ? "bg-acid-gradient"
              : "bg-grid-pattern"
      }`}
      style={
        wallpaperImageUrl
          ? { backgroundImage: `url(${wallpaperImageUrl})` }
          : undefined
      }
    >
      <Header initialProfile={profile || initialProfile} />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-extrabold uppercase text-[#111] bg-white/80 px-4 py-1.5 rounded-2xl border-3 border-[#111] shadow-[4px_4px_0px_#111]">
            Settings
          </h1>
          <Link
            href="/dashboard"
            prefetch={false}
            className="vybe-btn vybe-btn-ink px-4 py-2 text-sm flex items-center gap-1.5"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="flex flex-col gap-6">
          {/* Main Profile & Theme Settings Card */}
          <div className="vybe-card p-6 flex flex-col gap-6 bg-[#FAF8F5]">
            <h2 className="text-xl font-extrabold uppercase border-b-2 border-[#111] pb-2">
              Profile & Global Theme
            </h2>

            {/* Current Active Avatar & Upload */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-4 border-3 border-[#111] rounded-2xl shadow-[3px_3px_0px_#111]">
              <div className="w-20 h-20 rounded-full border-4 border-[#111] overflow-hidden bg-[#FAF8F5] shrink-0 shadow-[2px_2px_0px_#111] flex items-center justify-center">
                <img
                  src={effectiveAvatar}
                  alt=""
                  onError={() => setAvatarUrl(getAvatarUrl(null, username))}
                  className="w-full h-full object-cover select-none"
                  draggable={false}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold uppercase text-xs text-[#111] mb-1.5">
                  Current Avatar
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="vybe-btn px-4 py-2 cursor-pointer text-xs inline-block">
                    Upload Custom Photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAvatar(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => handleSelectDefaultAvatar("", "Default")}
                      className="vybe-btn vybe-btn-ink px-3 py-2 text-xs"
                      title="Reset to default preset"
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
                <p className="text-[11px] font-bold text-[#111]/60 mt-1 uppercase">
                  JPG, PNG, GIF or WEBP — or select a preset below
                </p>
              </div>
            </div>

            {/* Default Avatar Presets Selection */}
            <div className="flex flex-col gap-2">
              <span className="font-extrabold uppercase text-xs text-[#111] tracking-wider">
                Default Avatar Presets (Click to select)
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 bg-white p-3 border-3 border-[#111] rounded-xl shadow-[3px_3px_0px_#111]">
                {DEFAULT_AVATARS.map((preset) => {
                  const isSelected =
                    effectiveAvatar === preset.url ||
                    (!avatarUrl && getDefaultAvatar(username) === preset.url);

                  return (
                    <motion.button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectDefaultAvatar(preset.url, preset.name)}
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.92 }}
                      className={`relative aspect-square rounded-full border-3 border-[#111] overflow-hidden p-0.5 transition-all flex items-center justify-center bg-[#FAF8F5] ${
                        isSelected
                          ? "ring-3 ring-[#111] ring-offset-2 shadow-[2px_2px_0px_#111] scale-105"
                          : "hover:shadow-[2px_2px_0px_#111] opacity-85 hover:opacity-100"
                      }`}
                      title={`${preset.name} (Click to set as avatar)`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-contain pointer-events-none select-none"
                        draggable={false}
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <span className="text-white text-xs font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                            ✓
                          </span>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="font-extrabold uppercase text-sm text-[#111]">Username</label>
              <input
                className="vybe-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
              />
            </div>

            {/* Custom Web Color Picker for Header/Page Theme */}
            <div className="flex flex-col gap-1.5">
              <ColorPicker
                label="Page & Header Theme Color"
                value={headerColor}
                onChange={handleColorChange}
                storageKey="vybe_header_color"
              />
            </div>

            {/* Dashboard Wallpaper Presets */}
            <div className="flex flex-col gap-2">
              <p className="font-extrabold uppercase text-sm text-[#111]">
                Global Wallpaper Pattern
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {WALLPAPERS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setWallpaper(option.id);
                      setWallpaperImage(null);
                      setWallpaperImageUrl("");
                    }}
                    className={`border-4 border-[#111] rounded-2xl h-24 font-extrabold uppercase text-xs transition-all ${
                      option.id === "grid-pattern"
                        ? "bg-grid-pattern"
                        : option.id === "sand-waves"
                          ? "bg-sand-waves"
                          : "bg-acid-gradient"
                    } ${
                      wallpaper === option.id && !wallpaperImageUrl
                        ? "shadow-[5px_5px_0px_#111] -translate-x-0.5 -translate-y-0.5 ring-2 ring-[#111]"
                        : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Wallpaper Image */}
            <div className="flex flex-col gap-2">
              <label className="font-extrabold uppercase text-sm text-[#111]">
                Custom Background Image (App-Wide)
              </label>
              {wallpaperImageUrl && (
                <div className="relative h-44 border-4 border-[#111] rounded-xl overflow-hidden shadow-[3px_3px_0px_#111]">
                  <Image
                    src={wallpaperImageUrl}
                    alt="Custom wallpaper preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setWallpaperImageUrl("");
                      setWallpaperImage(null);
                    }}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-[#EF4444] hover:text-white text-[#111] border-2 border-[#111] rounded-lg px-2 py-1 text-xs font-extrabold uppercase transition-colors shadow-[2px_2px_0px_#111]"
                  >
                    Remove
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <label className="vybe-btn px-4 py-2 cursor-pointer text-sm inline-block">
                  {wallpaperImageUrl ? "Change wallpaper image" : "Upload background image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setWallpaperImage(file);
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setWallpaperImageUrl(ev.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Save Settings Action */}
            <div className="flex gap-3 pt-2">
              <motion.button
                type="button"
                className="vybe-btn py-3 px-6 flex-1 text-center font-black"
                onClick={handleSave}
                disabled={saving}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={transitionBouncy}
              >
                {saving ? "Saving settings..." : "Save Settings"}
              </motion.button>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="vybe-card p-6 flex flex-col gap-4 bg-[#FAF8F5]">
            <h2 className="text-xl font-extrabold uppercase border-b-2 border-[#111] pb-2">
              Security & Password
            </h2>
            <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-extrabold uppercase text-xs text-[#111]">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="vybe-input"
                  minLength={6}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-extrabold uppercase text-xs text-[#111]">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="vybe-input"
                  minLength={6}
                />
              </div>

              <motion.button
                type="submit"
                disabled={updatingPassword}
                className="vybe-btn py-3 text-center font-black"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={transitionBouncy}
              >
                {updatingPassword ? "Updating Password..." : "Update Password"}
              </motion.button>
            </form>
          </div>

          {/* Danger Zone: Delete Account */}
          <div className="vybe-card p-6 flex flex-col gap-4 bg-[#FAF8F5] border-[#EF4444]">
            <div className="flex items-center justify-between border-b-2 border-[#EF4444] pb-2">
              <h2 className="text-xl font-extrabold uppercase text-[#EF4444]">
                Danger Zone
              </h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]">
                Irreversible
              </span>
            </div>

            <p className="text-xs font-semibold text-[#111]/80">
              Permanently delete your user account along with all created diaries, notes, photos, and saved stickers.
            </p>

            <motion.button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="bg-[#EF4444] text-white border-3 border-[#111] rounded-xl py-2.5 px-4 font-black uppercase text-xs tracking-wider shadow-[3px_3px_0px_#111] hover:bg-[#DC2626] cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Delete Account
            </motion.button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div
            onClick={() => !deletingAccount && setShowDeleteModal(false)}
            className="fixed inset-0 z-50 bg-[#111]/60 backdrop-blur-[4px] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={transitionBouncy}
              onClick={(e) => e.stopPropagation()}
              className="vybe-card p-6 sm:p-8 w-full max-w-md bg-[#FAF8F5] border-[#EF4444] shadow-[8px_8px_0px_#111]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#EF4444] text-white flex items-center justify-center font-black text-xl border-2 border-[#111] shrink-0">
                  ⚠
                </div>
                <h2 className="text-xl font-black uppercase text-[#111]">
                  Delete Account?
                </h2>
              </div>

              <p className="text-sm font-semibold text-[#111]/80 mb-6">
                Are you sure? This will permanently delete your account and remove all your diaries, pages, and stickers. This action <strong className="text-[#EF4444]">cannot be undone</strong>.
              </p>

              <div className="flex gap-3">
                <motion.button
                  type="button"
                  disabled={deletingAccount}
                  onClick={handleDeleteAccount}
                  className="bg-[#EF4444] text-white border-3 border-[#111] rounded-xl py-3 px-4 flex-1 font-black uppercase text-xs shadow-[3px_3px_0px_#111] hover:bg-[#DC2626] cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {deletingAccount ? "Deleting..." : "Yes, Delete Account"}
                </motion.button>
                <button
                  type="button"
                  disabled={deletingAccount}
                  onClick={() => setShowDeleteModal(false)}
                  className="vybe-btn vybe-btn-ink px-4 py-3 text-xs"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
