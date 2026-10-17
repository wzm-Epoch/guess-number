import { createGame, submitGuess } from "@guess-number/game-core";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { StorageLike } from "./local-profile";
import { useLocalProfile } from "./use-local-profile";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  throwOnWrite = false;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.throwOnWrite) throw new Error("write denied");
    this.values.set(key, value);
  }
}

function completedWin() {
  return submitGuess(createGame({ minNumber: 1, maxNumber: 100, attemptLimit: 9 }, 42), 42).state;
}

describe("useLocalProfile", () => {
  it("registers, records, persists, logs out, and restores a local account", async () => {
    const storage = new MemoryStorage();
    const { result, unmount } = renderHook(() => useLocalProfile({
      storage,
      createAccountId: () => "user-alice",
      hashPassword: async (password) => `hashed:${password}`
    }));

    expect(result.current.currentAccount.isGuest).toBe(true);
    await act(async () => {
      await result.current.register({ username: "Alice", password: "pass", confirmation: "pass" });
    });
    expect(result.current.currentAccount.username).toBe("Alice");

    act(() => {
      result.current.recordGame(completedWin(), new Date("2026-10-17T12:00:00.000Z"), "win-1");
    });
    expect(result.current.currentAccount.points).toBe(1);
    expect(result.current.levelInfo.level).toBe(2);
    expect(result.current.persistenceWarning).toBe("");

    act(() => result.current.logout());
    expect(result.current.currentAccount.isGuest).toBe(true);
    unmount();

    const restored = renderHook(() => useLocalProfile({
      storage,
      createAccountId: () => "unused",
      hashPassword: async (password) => `hashed:${password}`
    }));
    expect(restored.result.current.currentAccount.isGuest).toBe(true);
    await act(async () => {
      await restored.result.current.login({ username: "alice", password: "pass" });
    });
    expect(restored.result.current.currentAccount).toMatchObject({ username: "Alice", points: 1 });
  });

  it("keeps in-memory progress and exposes a warning when saving fails", () => {
    const storage = new MemoryStorage();
    storage.throwOnWrite = true;
    const { result } = renderHook(() => useLocalProfile({
      storage,
      createAccountId: () => "unused",
      hashPassword: async (password) => `hashed:${password}`
    }));

    act(() => {
      result.current.recordGame(completedWin(), new Date("2026-10-17T12:00:00.000Z"), "win-1");
    });

    expect(result.current.currentAccount.points).toBe(1);
    expect(result.current.persistenceWarning).toBe("本机数据无法保存，关闭页面后可能丢失。");
  });
});
