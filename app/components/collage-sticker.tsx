"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface StickerProps {
  id: string;
  url: string;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  zIndex?: number;
  maxZIndex?: number;
  onUpdate: (
    id: string,
    updates: { x: number; y: number; scale: number; rotate: number; zIndex?: number },
  ) => void;
  onDelete?: (id: string) => void;
  onLayerChange?: (id: string, action: "behind" | "above" | "bottom" | "top") => void;
}

export function CollageSticker({
  id,
  url,
  x,
  y,
  scale,
  rotate,
  zIndex = 1,
  maxZIndex = 100,
  onUpdate,
  onDelete,
  onLayerChange,
}: StickerProps) {
  const [isSelected, setIsSelected] = useState(false);

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.05}
      style={{
        left: 0,
        top: 0,
        x,
        y,
        scale,
        rotate,
        touchAction: "none",
        position: "absolute",
        willChange: "transform",
        zIndex,
      }}
      whileDrag={{ scale: scale * 1.06, zIndex: maxZIndex + 50, cursor: "grabbing" }}
      onDragStart={() => setIsSelected(true)}
      onDragEnd={(_event, info) => {
        const newX = Math.round(x + info.offset.x);
        const newY = Math.round(y + info.offset.y);
        onUpdate(id, { x: newX, y: newY, scale, rotate, zIndex });
      }}
      onClick={(e) => {
        e.stopPropagation();
        setIsSelected((prev) => !prev);
      }}
      className="select-none cursor-grab group"
    >
      <div className="relative p-1 transition-all">
        {/* Delete button (top-right of sticker) */}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#EF4444] text-white border-2 border-[#111] font-black text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-125 transition-all z-50 shadow-[2px_2px_0px_#111] cursor-pointer"
            title="Remove sticker from page"
          >
            ✕
          </button>
        )}

        {/* Transparent Die-Cut Sticker Graphic */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center pointer-events-none select-none drop-shadow-[0_4px_6px_rgba(0,0,0,0.25)] group-hover:drop-shadow-[0_8px_14px_rgba(0,0,0,0.35)] transition-all">
          <img
            src={url}
            alt="Sticker"
            className="w-full h-full object-contain pointer-events-none select-none"
            loading="eager"
            draggable={false}
          />
        </div>

        {/* Minimalist Multi-Action Toolbar on Hover / Click */}
        <div
          className={`absolute -bottom-8 left-1/2 -translate-x-1/2 transition-all bg-[#111] text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 z-50 shadow-[3px_3px_0px_rgba(0,0,0,0.5)] whitespace-nowrap pointer-events-auto border border-white/30 ${
            isSelected ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {/* Size Down */}
          <button
            type="button"
            className="hover:text-[#14B8A6] font-black px-1 cursor-pointer transition-colors"
            title="Shrink Size"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(id, {
                x,
                y,
                scale: Math.max(0.3, Number((scale - 0.1).toFixed(1))),
                rotate,
                zIndex,
              });
            }}
          >
            −
          </button>
          <span className="text-[9px] text-[#faf8f5]/60">SIZE</span>
          {/* Size Up */}
          <button
            type="button"
            className="hover:text-[#14B8A6] font-black px-1 cursor-pointer transition-colors"
            title="Enlarge Size"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(id, {
                x,
                y,
                scale: Math.min(3.0, Number((scale + 0.1).toFixed(1))),
                rotate,
                zIndex,
              });
            }}
          >
            +
          </button>

          <span className="border-r border-white/25 h-3 mx-0.5" />

          {/* Rotate Left */}
          <button
            type="button"
            className="hover:text-[#F0625A] font-black px-1 cursor-pointer transition-colors"
            title="Rotate Left (15°)"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(id, { x, y, scale, rotate: (rotate - 15) % 360, zIndex });
            }}
          >
            ↺
          </button>
          {/* Rotate Right */}
          <button
            type="button"
            className="hover:text-[#F0625A] font-black px-1 cursor-pointer transition-colors"
            title="Rotate Right (15°)"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(id, { x, y, scale, rotate: (rotate + 15) % 360, zIndex });
            }}
          >
            ↻
          </button>

          <span className="border-r border-white/25 h-3 mx-0.5" />

          {/* Layer Down (Behind) */}
          <button
            type="button"
            className="hover:text-[#FACC15] font-black px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 cursor-pointer flex items-center gap-0.5 transition-colors"
            title="Send Behind (Layer Down)"
            onClick={(e) => {
              e.stopPropagation();
              if (onLayerChange) {
                onLayerChange(id, "behind");
              } else {
                onUpdate(id, { x, y, scale, rotate, zIndex: Math.max(1, zIndex - 1) });
              }
            }}
          >
            <span>⬇</span>
            <span className="text-[8px] uppercase">Behind</span>
          </button>

          {/* Layer Up (Above) */}
          <button
            type="button"
            className="hover:text-[#A3E635] font-black px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 cursor-pointer flex items-center gap-0.5 transition-colors"
            title="Bring Above (Layer Up)"
            onClick={(e) => {
              e.stopPropagation();
              if (onLayerChange) {
                onLayerChange(id, "above");
              } else {
                onUpdate(id, { x, y, scale, rotate, zIndex: Math.min(maxZIndex, zIndex + 1) });
              }
            }}
          >
            <span>⬆</span>
            <span className="text-[8px] uppercase">Above</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
