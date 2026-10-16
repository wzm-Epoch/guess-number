import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import * as themePickerModule from "./ThemePicker";

class MemoryStorage {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe("ThemePicker", () => {
  it("renders and applies all five themes", async () => {
    expect(themePickerModule.ThemePicker).toBeTypeOf("function");
    const user = userEvent.setup();
    const storage = new MemoryStorage();
    render(<themePickerModule.ThemePicker storage={storage} />);

    const options = [
      ["午夜", "midnight"],
      ["深海", "ocean"],
      ["森林", "forest"],
      ["落日", "sunset"],
      ["玫瑰", "rose"]
    ] as const;
    for (const [label, id] of options) {
      await user.click(screen.getByRole("button", { name: label }));
      expect(document.documentElement.dataset.theme).toBe(id);
      expect(storage.values.get("number-detective.theme.v1")).toBe(id);
    }
  });

  it("restores a saved theme and falls back for an unknown value", () => {
    const saved = new MemoryStorage();
    saved.values.set("number-detective.theme.v1", "ocean");
    const { unmount } = render(<themePickerModule.ThemePicker storage={saved} />);
    expect(document.documentElement.dataset.theme).toBe("ocean");
    expect(screen.getByRole("button", { name: "深海" })).toHaveAttribute("aria-pressed", "true");
    unmount();

    const unknown = new MemoryStorage();
    unknown.values.set("number-detective.theme.v1", "neon");
    render(<themePickerModule.ThemePicker storage={unknown} />);
    expect(document.documentElement.dataset.theme).toBe("midnight");
  });
});
