import { useEffect, useRef, useState } from "react";

import { loadTheme, saveTheme, type StorageLike, type ThemeId } from "../storage/theme";
import { themes } from "../theme/themes";

export interface ThemePickerProps {
  storage?: StorageLike;
}

export function ThemePicker({ storage = window.localStorage }: ThemePickerProps) {
  const [theme, setTheme] = useState<ThemeId>(() => loadTheme(storage));
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function selectTheme(nextTheme: ThemeId) {
    setTheme(nextTheme);
    saveTheme(storage, nextTheme);
  }

  return (
    <aside className="theme-dock" aria-label="背景颜色设置">
      <button
        ref={triggerRef}
        className="theme-trigger"
        type="button"
        aria-expanded={open}
        aria-controls="theme-options"
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">🎨</span>
        背景
      </button>
      {open ? (
        <div className="theme-panel" id="theme-options">
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
        </div>
      ) : null}
    </aside>
  );
}
