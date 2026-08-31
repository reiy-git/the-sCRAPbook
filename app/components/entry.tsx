"use client";

import Image from "next/image";
import type { DiaryEntry, Sticker } from "@/lib/types";

interface EntryProps {
  entry: DiaryEntry | undefined;
  stickers?: Sticker[];
}

export default function Entry({ entry, stickers }: EntryProps) {
  const collage = stickers ?? entry?.stickers_json ?? [];

  if (!entry) {
    return (
      <div className="text-center py-16 uppercase font-extrabold tracking-widest text-[#111]/50">
        Blank page — add an entry
      </div>
    );
  }

  return (
    <div className="relative min-h-[280px]">
      <h2 className="text-3xl font-extrabold uppercase tracking-tight mb-3">{entry.title}</h2>
      <p className="whitespace-pre-wrap text-lg leading-relaxed font-medium">{entry.content}</p>
      {collage.map((sticker) => (
        <div
          key={sticker.id}
          className="absolute pointer-events-none border-2 border-[#111] bg-white p-1 shadow-[2px_2px_0px_#111] rounded-md"
          style={{
            transform: `translate(${sticker.x}px, ${sticker.y}px) scale(${sticker.scale}) rotate(${sticker.rotate}deg)`,
            transformOrigin: "top left",
          }}
        >
          <Image
            src={sticker.url}
            alt=""
            width={96}
            height={96}
            className="w-24 h-24 object-cover"
            unoptimized
          />
        </div>
      ))}
    </div>
  );
}
