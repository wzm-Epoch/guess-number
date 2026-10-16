import { useEffect, useState } from "react";

import { loadTheme, saveTheme, type StorageLike, type ThemeId } from "../storage/theme";
import { themes } from "../theme/themes";

export interface ThemePickerProps {
  storage?: StorageLike;
}

export function ThemePicker({ storage = window.localStorage }: ThemePickerProps) {
  const [theme, setTheme] = useState<ThemeId>(() => loadTheme(storage));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function selectTheme(nextTheme: ThemeId) {
    setTheme(nextTheme);
    saveTheme(storage, nextTheme);
  }

  return (
    <aside className="theme-dock" aria-label="背景颜色设置">
      <span className="theme-palette-title">选择背景颜色</span>
      <div className="theme-options">
        {themes.map((option) => (
          <button
            className="theme-option"
            type="button"
            aria-label={option.ariaLabel}
            aria-pressed={theme === option.id}
            data-theme-id={option.id}
            key={option.id}
            onClick={() => selectTheme(option.id)}
          >
            <span className="theme-swatch" aria-hidden="true" />
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
