"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getUserInsights, type UserInsights } from "@/app/actions/getUserInsights";
import { getAvatarUrl } from "@/lib/default-avatars";
import { transitionBouncy } from "@/lib/motion";

interface InsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InsightsModal({ isOpen, onClose }: InsightsModalProps) {
  const [insights, setInsights] = useState<UserInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarSrc, setAvatarSrc] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getUserInsights()
        .then((data) => {
          setInsights(data);
          setAvatarSrc(getAvatarUrl(data?.avatarUrl, data?.username));
        })
        .catch((err) => console.error("Failed to load insights:", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const effectiveAvatar = avatarSrc || getAvatarUrl(null, insights?.username);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-50 bg-[#111]/50 backdrop-blur-[4px] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={transitionBouncy}
            onClick={(e) => e.stopPropagation()}
            className="vybe-card p-6 sm:p-8 w-full max-w-lg bg-[#FAF8F5] relative overflow-hidden"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full border-2 border-[#111] bg-white hover:bg-[#EF4444] hover:text-white font-black text-sm flex items-center justify-center transition-colors cursor-pointer shadow-[2px_2px_0px_#111]"
            >
              ✕
            </button>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-[#111] border-t-transparent rounded-full animate-spin" />
                <span className="font-extrabold uppercase text-xs tracking-wider">
                  Gathering your creator stats...
                </span>
              </div>
            ) : insights ? (
              <div className="flex flex-col gap-5">
                {/* Header with Avatar & Rank */}
                <div className="flex items-center gap-4 pb-4 border-b-3 border-[#111]">
                  <div className="w-16 h-16 rounded-full border-3 border-[#111] overflow-hidden bg-[#14B8A6] shrink-0 shadow-[3px_3px_0px_#111] flex items-center justify-center">
                    <img
                      src={effectiveAvatar}
                      alt=""
                    onError={() => setAvatarSrc(getAvatarUrl(null, insights.username))}
                      className="w-full h-full object-cover select-none"
                      draggable={false}
                    />
                  </div>

                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-[#111]">
                      {insights.username}
                    </h2>
                    <div className="inline-block px-2.5 py-0.5 mt-1 border-2 border-[#111] rounded-lg bg-[#FACC15] text-[#111] text-xs font-black uppercase shadow-[1px_1px_0px_#111]">
                      ★ {insights.rankTitle}
                    </div>
                  </div>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="border-3 border-[#111] rounded-2xl p-3 bg-white shadow-[3px_3px_0px_#111] flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-[#111]/60 tracking-wider">
                      Total Words
                    </span>
                    <span className="text-2xl font-black text-[#111] mt-1">
                      {insights.totalWords.toLocaleString()}
                    </span>
                  </div>

                  <div className="border-3 border-[#111] rounded-2xl p-3 bg-white shadow-[3px_3px_0px_#111] flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-[#111]/60 tracking-wider">
                      Days Written
                    </span>
                    <span className="text-2xl font-black text-[#14B8A6] mt-1">
                      {insights.uniqueDaysCount} <span className="text-xs text-[#111]">days</span>
                    </span>
                  </div>

                  <div className="border-3 border-[#111] rounded-2xl p-3 bg-white shadow-[3px_3px_0px_#111] flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-[#111]/60 tracking-wider">
                      Longest Streak
                    </span>
                    <span className="text-2xl font-black text-[#F0625A] mt-1">
                      {insights.longestStreak} <span className="text-xs text-[#111]">🔥</span>
                    </span>
                  </div>

                  <div className="border-3 border-[#111] rounded-2xl p-3 bg-white shadow-[3px_3px_0px_#111] flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-[#111]/60 tracking-wider">
                      Active Streak
                    </span>
                    <span className="text-2xl font-black text-[#FB923C] mt-1">
                      {insights.currentStreak} <span className="text-xs text-[#111]">⚡</span>
                    </span>
                  </div>

                  <div className="border-3 border-[#111] rounded-2xl p-3 bg-white shadow-[3px_3px_0px_#111] flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-[#111]/60 tracking-wider">
                      Stickers Placed
                    </span>
                    <span className="text-2xl font-black text-[#8B5CF6] mt-1">
                      {insights.totalStickers} <span className="text-xs text-[#111]">🎨</span>
                    </span>
                  </div>

                  <div className="border-3 border-[#111] rounded-2xl p-3 bg-white shadow-[3px_3px_0px_#111] flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-[#111]/60 tracking-wider">
                      Diaries Made
                    </span>
                    <span className="text-2xl font-black text-[#111] mt-1">
                      {insights.totalDiaries} <span className="text-xs text-[#111]">📖</span>
                    </span>
                  </div>
                </div>

                {/* Extra Insights Bar */}
                <div className="flex items-center justify-between p-3 border-2 border-[#111] rounded-xl bg-[#FAF8F5]">
                  <div className="text-xs font-extrabold uppercase text-[#111]/70">
                    Avg words/entry: <span className="text-[#111] font-black">{insights.avgWordsPerEntry}</span>
                  </div>
                  <div className="text-xs font-extrabold uppercase text-[#111]/70">
                    Started: <span className="text-[#111] font-black">{insights.memberSince}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center font-bold">
                Could not load insights.
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
