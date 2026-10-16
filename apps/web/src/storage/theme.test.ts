import { describe, expect, it } from "vitest";

import * as theme from "./theme";

class MemoryStorage {
  readonly values = new Map<string, string>();
  throwOnRead = false;
  throwOnWrite = false;

  getItem(key: string): string | null {
    if (this.throwOnRead) throw new Error("read denied");
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.throwOnWrite) throw new Error("write denied");
    this.values.set(key, value);
  }
}

describe("theme persistence", () => {
  it("restores every known theme and falls back to midnight", () => {
    expect(theme.loadTheme).toBeTypeOf("function");
    const memory = new MemoryStorage();

    for (const themeId of ["midnight", "ocean", "forest", "sunset", "rose"]) {
      memory.values.set("number-detective.theme.v1", themeId);
      expect(theme.loadTheme(memory)).toBe(themeId);
    }

    memory.values.set("number-detective.theme.v1", "unknown");
    expect(theme.loadTheme(memory)).toBe("midnight");
    memory.throwOnRead = true;
    expect(theme.loadTheme(memory)).toBe("midnight");
  });

  it("saves only known themes and reports storage failures", () => {
    expect(theme.saveTheme).toBeTypeOf("function");
    const memory = new MemoryStorage();
    expect(theme.saveTheme(memory, "forest")).toBe(true);
    expect(memory.values.get("number-detective.theme.v1")).toBe("forest");

    const saveExternalTheme = theme.saveTheme as (storage: MemoryStorage, value: string) => boolean;
    expect(saveExternalTheme(memory, "unknown")).toBe(false);
    expect(memory.values.get("number-detective.theme.v1")).toBe("forest");

    memory.throwOnWrite = true;
    expect(theme.saveTheme(memory, "rose")).toBe(false);
  });
});
