import { describe, expect, it } from "vitest";

import {
  createInitialLocalProfile,
  loadLocalProfile,
  saveLocalProfile,
  type StorageLike
} from "./local-profile";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  readonly readKeys: string[] = [];
  throwOnRead = false;
  throwOnWrite = false;

  getItem(key: string): string | null {
    this.readKeys.push(key);
    if (this.throwOnRead) throw new Error("read denied");
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.throwOnWrite) throw new Error("write denied");
    this.values.set(key, value);
  }
}

const storageKey = "number-detective.local-accounts.v1";

describe("local profile persistence", () => {
  it("creates a fresh guest profile without reading legacy storage keys", () => {
    const storage = new MemoryStorage();

    const profile = loadLocalProfile(storage);

    expect(profile).toEqual(createInitialLocalProfile());
    expect(storage.readKeys).toEqual([storageKey]);
    expect(storage.readKeys).not.toContain("number-detective.accounts.v2");
    expect(storage.readKeys).not.toContain("number-detective.guest.v1");
  });

  it("falls back to a fresh guest profile for malformed or unavailable storage", () => {
    const malformed = new MemoryStorage();
    malformed.values.set(storageKey, "{broken");
    expect(loadLocalProfile(malformed)).toEqual(createInitialLocalProfile());

    const unavailable = new MemoryStorage();
    unavailable.throwOnRead = true;
    expect(loadLocalProfile(unavailable)).toEqual(createInitialLocalProfile());
  });

  it("normalizes accounts, records, points, and an invalid current session", () => {
    const storage = new MemoryStorage();
    const records = Array.from({ length: 205 }, (_, index) => ({
      id: index === 0 ? "" : `record-${index}`,
      result: index % 2 === 0 ? "won" : "unexpected",
      attempts: index + 1,
      secretNumber: index + 1,
      guesses: [1, "2", 3.5, 101],
      pointsEarned: 99,
      playedAt: index === 0 ? "2026-10-17T10:00:00.000Z" : "bad-date"
    }));
    storage.values.set(storageKey, JSON.stringify({
      version: 99,
      currentAccountId: "missing",
      accounts: {
        guest: { id: "wrong", username: "Wrong", points: 50, records: [] },
        alice: {
          id: "alice",
          username: "  Alice  ",
          isGuest: false,
          passwordHash: "hash",
          points: 12.9,
          records
        },
        invalid: { id: "invalid", username: "x", passwordHash: "", points: 10, records: [] }
      }
    }));

    const profile = loadLocalProfile(storage);

    expect(profile.version).toBe(1);
    expect(profile.currentAccountId).toBe("guest");
    expect(profile.accounts.guest).toMatchObject({
      id: "guest",
      username: "游客",
      isGuest: true,
      passwordHash: "",
      points: 0
    });
    expect(profile.accounts.invalid).toBeUndefined();
    expect(profile.accounts.alice).toMatchObject({
      id: "alice",
      username: "Alice",
      isGuest: false,
      passwordHash: "hash",
      points: 12
    });
    expect(profile.accounts.alice.records).toHaveLength(200);
    expect(profile.accounts.alice.records[0]).toEqual({
      id: "recovered-0",
      result: "won",
      attempts: 1,
      secretNumber: 1,
      guesses: [1, 2],
      pointsEarned: 1,
      playedAt: "2026-10-17T10:00:00.000Z"
    });
    expect(profile.accounts.alice.records[1]).toMatchObject({
      result: "lost",
      attempts: 2,
      secretNumber: 2,
      pointsEarned: 0,
      playedAt: "1970-01-01T00:00:00.000Z"
    });
  });

  it("restores a valid signed-in account", () => {
    const storage = new MemoryStorage();
    storage.values.set(storageKey, JSON.stringify({
      version: 1,
      currentAccountId: "alice",
      accounts: {
        alice: {
          id: "alice",
          username: "Alice",
          isGuest: false,
          passwordHash: "hash",
          points: 3,
          records: []
        }
      }
    }));

    expect(loadLocalProfile(storage).currentAccountId).toBe("alice");
  });

  it("saves normalized state and reports write failures", () => {
    const storage = new MemoryStorage();
    const state = createInitialLocalProfile();
    expect(saveLocalProfile(storage, state)).toBe(true);
    expect(JSON.parse(storage.values.get(storageKey) ?? "null")).toEqual(state);

    storage.throwOnWrite = true;
    expect(saveLocalProfile(storage, state)).toBe(false);
  });
});
