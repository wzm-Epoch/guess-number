const STORAGE_KEY = "number-detective.theme.v1";

export const THEME_IDS = ["midnight", "ocean", "forest", "sunset", "rose"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEME_IDS.includes(value as ThemeId);
}

export function loadTheme(storage: StorageLike): ThemeId {
  try {
    const saved = storage.getItem(STORAGE_KEY);
    return isThemeId(saved) ? saved : "midnight";
  } catch {
    return "midnight";
  }
}

export function saveTheme(storage: StorageLike, theme: ThemeId): boolean {
  if (!isThemeId(theme)) return false;
  try {
    storage.setItem(STORAGE_KEY, theme);
    return true;
  } catch {
    return false;
  }
}
