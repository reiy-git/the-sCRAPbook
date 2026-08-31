// Curated high-contrast SVG avatar presets. Encoding the complete SVG (rather
// than fragments inside base64) keeps hex colors valid in every browser.
export interface AvatarPreset {
  id: string;
  name: string;
  url: string;
}

const svgDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

const avatar = (background: string, artwork: string) =>
  svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="${background}" stroke="#111111" stroke-width="6"/>${artwork}</svg>`);

export const DEFAULT_AVATARS: AvatarPreset[] = [
  { id: "preset-cyber-cat", name: "Cyber Cat", url: avatar("#F472B6", `<path d="M22 42 28 18l16 17h12l16-17 6 24v31H22Z" fill="#FAF8F5" stroke="#111" stroke-width="5" stroke-linejoin="round"/><circle cx="37" cy="53" r="5" fill="#14B8A6"/><circle cx="63" cy="53" r="5" fill="#14B8A6"/><path d="M40 69q10 9 20 0" fill="none" stroke="#111" stroke-width="5" stroke-linecap="round"/>`) },
  { id: "preset-acid-smile", name: "Acid Smile", url: avatar("#A3E635", `<circle cx="35" cy="43" r="7" fill="#111"/><circle cx="65" cy="43" r="7" fill="#111"/><path d="M24 60q26 30 52 0Z" fill="#111"/><path d="M34 64q16 15 32 0" fill="#FAF8F5"/>`) },
  { id: "preset-star-kid", name: "Star Kid", url: avatar("#FACC15", `<path d="m35 30 5 14h15L43 53l5 16-13-9-13 9 5-16-12-9h15Z" fill="#111"/><path d="m65 30 5 14h15L73 53l5 16-13-9-13 9 5-16-12-9h15Z" fill="#111"/><path d="M38 76q12 10 24 0" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round"/>`) },
  { id: "preset-cyber-shade", name: "Cyber Shade", url: avatar("#14B8A6", `<rect x="17" y="34" width="66" height="31" rx="14" fill="#111" stroke="#FAF8F5" stroke-width="4"/><circle cx="36" cy="49" r="7" fill="#F0625A"/><circle cx="64" cy="49" r="7" fill="#F0625A"/><path d="M34 76h32" stroke="#111" stroke-width="6" stroke-linecap="round"/>`) },
  { id: "preset-astro-ghost", name: "Astro Ghost", url: avatar("#8B5CF6", `<path d="M24 70V49a26 26 0 0 1 52 0v21l-10-7-16 9-16-9Z" fill="#FAF8F5" stroke="#111" stroke-width="4"/><circle cx="40" cy="49" r="5" fill="#111"/><circle cx="60" cy="49" r="5" fill="#111"/><circle cx="50" cy="60" r="4" fill="#F0625A"/>`) },
  { id: "preset-flame-skull", name: "Flame Skull", url: avatar("#F0625A", `<path d="M32 31q0-15 10-20l2 13q6-12 15-13l-1 14q9-5 12 8v34q0 10-10 10H40q-10 0-10-10Z" fill="#FAF8F5" stroke="#111" stroke-width="4"/><circle cx="42" cy="48" r="6" fill="#111"/><circle cx="58" cy="48" r="6" fill="#111"/><path d="M42 66h16M46 61v10m8-10v10" stroke="#111" stroke-width="3"/>`) },
  { id: "preset-skate-bear", name: "Skate Bear", url: avatar("#FB923C", `<circle cx="30" cy="29" r="13" fill="#111"/><circle cx="70" cy="29" r="13" fill="#111"/><circle cx="50" cy="57" r="30" fill="#FAF8F5" stroke="#111" stroke-width="4"/><circle cx="40" cy="51" r="4" fill="#111"/><circle cx="60" cy="51" r="4" fill="#111"/><ellipse cx="50" cy="62" rx="9" ry="6" fill="#111"/>`) },
  { id: "preset-pixel-bot", name: "Pixel Bot", url: avatar("#38BDF8", `<rect x="20" y="27" width="60" height="49" rx="7" fill="#111" stroke="#FAF8F5" stroke-width="4"/><rect x="30" y="40" width="14" height="10" fill="#A3E635"/><rect x="56" y="40" width="14" height="10" fill="#A3E635"/><path d="M37 62h26" stroke="#FAF8F5" stroke-width="5"/><path d="M50 27V15" stroke="#111" stroke-width="5"/><circle cx="50" cy="12" r="5" fill="#F0625A"/>`) },
];

export function getDefaultAvatar(username?: string | null): string {
  if (!username) return DEFAULT_AVATARS[0].url;
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash << 5) - hash + username.charCodeAt(i);
    hash |= 0;
  }
  return DEFAULT_AVATARS[Math.abs(hash) % DEFAULT_AVATARS.length].url;
}

/** Replaces malformed legacy preset SVG URLs saved before the asset fix. */
export function getAvatarUrl(avatarUrl?: string | null, username?: string | null): string {
  if (avatarUrl && !avatarUrl.startsWith("data:image/svg+xml;base64,")) return avatarUrl;
  return getDefaultAvatar(username);
}

export function getContrastTextColor(hexColor?: string | null): string {
  if (!hexColor || !hexColor.startsWith("#")) return "#111111";
  const hex = hexColor.replace("#", "");
  if (hex.length !== 3 && hex.length !== 6) return "#111111";
  const expanded = hex.length === 3 ? hex.split("").map((value) => value + value).join("") : hex;
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(expanded.slice(index, index + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 >= 140 ? "#111111" : "#FAF8F5";
}
