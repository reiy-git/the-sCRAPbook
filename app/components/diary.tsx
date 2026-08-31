"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import ColorPicker from "@/app/components/color-picker";
import { deleteDiary } from "../actions/deleteDiary";
import { editDiary } from "../actions/editDiary";
import { uploadImage } from "@/lib/supabase/storage";
import { transitionBouncy } from "@/lib/motion";
import type { Diary } from "@/lib/types";

interface DiaryCardProps {
  diary: Diary;
  onDelete: (diaryId: string) => void;
  onUpdate: (diary: Diary) => void;
}

export default function DiaryCard({ diary, onDelete, onUpdate }: DiaryCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [diaryValues, setDiaryValues] = useState({
    title: diary.title,
    description: diary.description || "",
    theme_color: diary.theme_color || "#FAF8F5",
    cover_image_url: diary.cover_image_url || "",
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const handleEditClick = () => {
    setDiaryValues({
      title: diary.title,
      description: diary.description || "",
      theme_color: diary.theme_color || "#FAF8F5",
      cover_image_url: diary.cover_image_url || "",
    });
    setCoverFile(null);
    setShowEdit(true);
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setDiaryValues((prevValues) => ({
      ...prevValues,
      [name]: value,
    }));
  };

  const handleConfirmDelete = async () => {
    setIsSubmitting(true);
    try {
      await deleteDiary(diary.id);
      toast.success(`Deleted "${diary.title}"`);
      onDelete(diary.id);
      setShowConfirm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!diaryValues.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setIsEditing(true);
    try {
      let coverUrl = diaryValues.cover_image_url || null;
      if (coverFile) {
        coverUrl = await uploadImage(coverFile, "entry-images");
      }
      await editDiary(
        diary.id,
        diaryValues.title,
        diaryValues.description,
        coverUrl,
        diaryValues.theme_color,
      );
      toast.success("Diary updated");
      onUpdate({
        ...diary,
        title: diaryValues.title,
        description: diaryValues.description,
        cover_image_url: coverUrl,
        theme_color: diaryValues.theme_color,
        updated_at: new Date().toISOString(),
      });
      setShowEdit(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to edit");
    } finally {
      setIsEditing(false);
    }
  };

  const theme = diary.theme_color || "#FAF8F5";

  return (
    <motion.div layout transition={transitionBouncy} className="text-[#111]">
      {showConfirm ? (
        <div role="dialog" aria-modal="true" className="vybe-card p-6 flex flex-col gap-3">
          <h2 className="font-extrabold uppercase">Delete “{diary.title}”?</h2>
          <motion.button
            type="button"
            onClick={handleConfirmDelete}
            disabled={isSubmitting}
            className="vybe-btn py-2"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
          >
            {isSubmitting ? "Deleting..." : "Confirm"}
          </motion.button>
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            disabled={isSubmitting}
            className="vybe-btn vybe-btn-ink py-2"
          >
            Cancel
          </button>
        </div>
      ) : showEdit ? (
        <div role="dialog" aria-modal="true" className="vybe-card p-6 flex flex-col gap-4">
          <h2 className="font-extrabold uppercase">Edit “{diary.title}”</h2>
          <label htmlFor={`title-${diary.id}`} className="font-bold text-sm uppercase">
            Title
          </label>
          <input
            id={`title-${diary.id}`}
            type="text"
            className="vybe-input"
            placeholder="Title"
            name="title"
            value={diaryValues.title}
            onChange={handleChange}
          />
          <label htmlFor={`description-${diary.id}`} className="font-bold text-sm uppercase">
            Description
          </label>
          <input
            id={`description-${diary.id}`}
            type="text"
            className="vybe-input"
            placeholder="Description"
            name="description"
            value={diaryValues.description}
            onChange={handleChange}
          />

          <ColorPicker
            label="Theme color"
            value={diaryValues.theme_color}
            onChange={(c) =>
              setDiaryValues((v) => ({ ...v, theme_color: c }))
            }
          />

          <div className="flex flex-col gap-1">
            <label className="font-bold text-xs uppercase">Diary Wallpaper / Cover</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              className="text-xs font-semibold file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border file:border-[#111] file:bg-[#FAF8F5] file:font-black file:uppercase file:cursor-pointer"
            />
            {diaryValues.cover_image_url && !coverFile && (
              <div className="flex items-center justify-between text-xs mt-1 bg-white p-1.5 border-2 border-[#111] rounded-lg">
                <span className="font-extrabold uppercase text-[10px] text-[#111]/70 truncate max-w-[180px]">
                  Custom wallpaper active
                </span>
                <button
                  type="button"
                  onClick={() => setDiaryValues((v) => ({ ...v, cover_image_url: "" }))}
                  className="text-[10px] font-black uppercase text-[#EF4444] hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <motion.button
              type="button"
              onClick={handleEdit}
              disabled={isEditing}
              className="vybe-btn py-2 flex-1"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
            >
              {isEditing ? "Saving..." : "Confirm"}
            </motion.button>
            <button
              type="button"
              onClick={() => setShowEdit(false)}
              disabled={isEditing}
              className="vybe-btn vybe-btn-ink py-2 px-4"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="vybe-card overflow-hidden" style={{ backgroundColor: theme }}>
          {diary.cover_image_url ? (
            <div className="relative h-36 border-b-4 border-[#111]">
              <Image
                src={diary.cover_image_url}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 20vw"
                unoptimized
              />
            </div>
          ) : (
            <div className="h-10 border-b-4 border-[#111] bg-black/10" />
          )}
          <div className="p-4">
            <h2 className="text-xl font-extrabold uppercase mb-2">{diary.title}</h2>
            <p className="mb-3 font-medium text-[#111]/70 line-clamp-3">
              {diary.description || "No description"}
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-[#111]/50 mb-4">
              Created{" "}
              {diary.created_at
                ? new Date(diary.created_at).toLocaleDateString()
                : "Unknown date"}
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href={`/diary/${diary.id}`}
                prefetch={false}
                className="vybe-btn text-center py-2 px-4 text-sm font-black"
              >
                View Diary
              </Link>
              <button
                type="button"
                onClick={handleEditClick}
                className="vybe-btn text-center py-2 px-4 text-sm"
              >
                Edit Diary
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="vybe-btn vybe-btn-ink text-center py-2 px-4 text-sm"
              >
                Delete Diary
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
