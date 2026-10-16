import type { ThemeId } from "../storage/theme";

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  ariaLabel: string;
}

export const themes: readonly ThemeDefinition[] = [
  { id: "midnight", label: "午夜", ariaLabel: "午夜" },
  { id: "ocean", label: "深海", ariaLabel: "深海" },
  { id: "forest", label: "森林", ariaLabel: "森林" },
  { id: "sunset", label: "落日", ariaLabel: "落日" },
  { id: "rose", label: "玫瑰", ariaLabel: "玫瑰" }
];
