export type DashboardBackground = "grid-pattern" | "sand-waves" | "acid-gradient";

export type Profile = {
  id: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  dashboard_background: DashboardBackground;
  wallpaper_image_url: string | null;
  header_color: string;
  created_at?: string;
};

export type Diary = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  theme_color: string | null;
  isDeleted: boolean;
  created_at: string;
  updated_at: string;
};

export type Sticker = {
  id: string;
  url: string;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  zIndex?: number;
};

export type DiaryEntry = {
  id: string;
  diary_id: string;
  user_id: string;
  title: string;
  content: string;
  entry_date: string;
  stickers_json: Sticker[];
  isDeleted: boolean;
  created_at: string;
  updated_at: string;
};

export type AuthFormState = {
  message: string;
};
