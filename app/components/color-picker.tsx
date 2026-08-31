"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export interface ColorTheme {
  name: string;
  hex: string;
}

export const VYBE_THEME_PALETTE: ColorTheme[] = [
  { name: "Coral Heat", hex: "#F0625A" },
  { name: "Cyber Teal", hex: "#14B8A6" },
  { name: "Acid Lime", hex: "#A3E635" },
  { name: "Electric Violet", hex: "#8B5CF6" },
  { name: "Solar Yellow", hex: "#FACC15" },
  { name: "Bubblegum Pink", hex: "#F472B6" },
  { name: "Tangerine", hex: "#FB923C" },
  { name: "Sky Blue", hex: "#38BDF8" },
  { name: "Mint Drop", hex: "#34D399" },
  { name: "Sunset Crimson", hex: "#EF4444" },
  { name: "Milk Cream", hex: "#FAF8F5" },
  { name: "Deep Ink", hex: "#111111" },
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  storageKey?: string;
  label?: string;
}

export function ColorPicker({
  value,
  onChange,
  storageKey,
  label,
}: ColorPickerProps) {
  const [currentHex, setCurrentHex] = useState(value || "#F0625A");

  useEffect(() => {
    if (value) {
      setCurrentHex(value);
    }
  }, [value]);

  const handleSelectColor = (hex: string) => {
    setCurrentHex(hex);
    onChange(hex);

    if (storageKey === "vybe_header_color" && typeof document !== "undefined") {
      document.documentElement.style.setProperty("--vybe-theme", hex);
      // Import/calculate contrast text
      const cleanHex = hex.replace("#", "");
      let r = 0, g = 0, b = 0;
      if (cleanHex.length === 3) {
        r = parseInt(cleanHex[0] + cleanHex[0], 16);
        g = parseInt(cleanHex[1] + cleanHex[1], 16);
        b = parseInt(cleanHex[2] + cleanHex[2], 16);
      } else if (cleanHex.length === 6) {
        r = parseInt(cleanHex.substring(0, 2), 16);
        g = parseInt(cleanHex.substring(2, 4), 16);
        b = parseInt(cleanHex.substring(4, 6), 16);
      }
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      document.documentElement.style.setProperty("--vybe-theme-text", yiq >= 140 ? "#111111" : "#FAF8F5");
    }

    if (storageKey && typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, hex);
        window.dispatchEvent(
          new CustomEvent("vybe_color_update", {
            detail: { key: storageKey, color: hex },
          }),
        );
      } catch (err) {
        console.error("Failed to save color to localStorage", err);
      }
    }
  };

  const handleHexInput = (val: string) => {
    let formatted = val.trim();
    if (!formatted.startsWith("#")) {
      formatted = "#" + formatted;
    }
    setCurrentHex(formatted);
    if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(formatted)) {
      handleSelectColor(formatted);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {label && (
        <span className="font-extrabold uppercase text-xs tracking-wider text-[#111]">
          {label}
        </span>
      )}

      {/* Preset Swatches Grid */}
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 p-2.5 bg-white border-3 border-[#111] rounded-xl shadow-[3px_3px_0px_#111]">
        {VYBE_THEME_PALETTE.map((theme) => {
          const isSelected =
            currentHex.toLowerCase() === theme.hex.toLowerCase();
          const isDark =
            theme.hex === "#111111" ||
            theme.hex === "#8B5CF6" ||
            theme.hex === "#EF4444";

          return (
            <motion.button
              key={theme.name}
              type="button"
              title={`${theme.name} (${theme.hex})`}
              onClick={() => handleSelectColor(theme.hex)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              className={`relative h-8 w-full rounded-lg border-2 border-[#111] cursor-pointer transition-all flex items-center justify-center ${
                isSelected
                  ? "ring-2 ring-offset-1 ring-[#111] shadow-[2px_2px_0px_#111] font-black"
                  : "hover:shadow-[2px_2px_0px_#111]"
              }`}
              style={{ backgroundColor: theme.hex }}
            >
              {isSelected && (
                <span
                  className={`text-xs font-black ${
                    isDark ? "text-white" : "text-[#111]"
                  }`}
                >
                  ✓
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Custom HEX & Live Preview Bar */}
      <div className="flex items-center gap-3 bg-white p-2 border-3 border-[#111] rounded-xl shadow-[3px_3px_0px_#111]">
        <div
          className="w-9 h-9 rounded-lg border-2 border-[#111] shrink-0 shadow-[1px_1px_0px_#111]"
          style={{ backgroundColor: currentHex }}
        />
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="font-extrabold text-xs uppercase text-[#111]/70">
            HEX:
          </span>
          <input
            type="text"
            value={currentHex}
            onChange={(e) => handleHexInput(e.target.value)}
            placeholder="#F0625A"
            maxLength={7}
            className="w-full bg-transparent font-mono font-bold text-sm tracking-wider outline-none text-[#111] uppercase"
          />
        </div>
        <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 border border-[#111] rounded bg-[#FAF8F5] shrink-0 text-[#111]/80">
          {VYBE_THEME_PALETTE.find(
            (t) => t.hex.toLowerCase() === currentHex.toLowerCase(),
          )?.name || "Custom"}
        </span>
      </div>
    </div>
  );
}

export default ColorPicker;

