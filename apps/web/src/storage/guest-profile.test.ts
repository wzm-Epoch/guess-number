import { createGame, submitGuess } from "@guess-number/game-core";
import { describe, expect, it } from "vitest";

import * as storage from "./guest-profile";

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

const storageKey = "number-detective.guest.v1";

describe("guest profile persistence", () => {
  it("returns an empty guest profile when storage is empty, malformed, or unavailable", () => {
    expect(storage.loadGuestProfile).toBeTypeOf("function");
    const empty = new MemoryStorage();
    expect(storage.loadGuestProfile(empty)).toEqual({ points: 0, records: [] });

    empty.values.set(storageKey, "{broken");
    expect(storage.loadGuestProfile(empty)).toEqual({ points: 0, records: [] });

    empty.throwOnRead = true;
    expect(storage.loadGuestProfile(empty)).toEqual({ points: 0, records: [] });
  });

  it("normalizes external values and keeps the newest 200 records", () => {
    const memory = new MemoryStorage();
    const records = Array.from({ length: 205 }, (_, index) => ({
      id: `record-${index}`,
      result: index % 2 === 0 ? "won" : "anything-else",
      attempts: index + 1,
      secretNumber: index + 1,
      guesses: [1, "2", 3.5, 101],
      pointsEarned: 99,
      playedAt: index === 0 ? "2026-10-16T12:00:00.000Z" : "invalid"
    }));
    memory.values.set(storageKey, JSON.stringify({ points: -20, records }));

    const profile = storage.loadGuestProfile(memory);

    expect(profile.points).toBe(0);
    expect(profile.records).toHaveLength(200);
    expect(profile.records[0]).toEqual({
      id: "record-0",
      result: "won",
      attempts: 1,
      secretNumber: 1,
      guesses: [1, 2],
      pointsEarned: 1,
      playedAt: "2026-10-16T12:00:00.000Z"
    });
    expect(profile.records[1]).toMatchObject({
      id: "record-1",
      result: "lost",
      attempts: 2,
      secretNumber: 2,
      pointsEarned: 0
    });
  });

  it("records wins and losses immutably with the correct reward", () => {
    expect(storage.recordFinishedGame).toBeTypeOf("function");
    const initialProfile = { points: 3, records: [] };
    const won = submitGuess(createGame({ minNumber: 1, maxNumber: 100, attemptLimit: 9 }, 42), 42).state;
    const afterWin = storage.recordFinishedGame(
      initialProfile,
      won,
      new Date("2026-10-16T13:00:00.000Z"),
      "win-1"
    );

    expect(initialProfile).toEqual({ points: 3, records: [] });
    expect(afterWin.points).toBe(4);
    expect(afterWin.records[0]).toMatchObject({
      id: "win-1",
      result: "won",
      attempts: 1,
      secretNumber: 42,
      guesses: [42],
      pointsEarned: 1,
      playedAt: "2026-10-16T13:00:00.000Z"
    });

    let lost = createGame({ minNumber: 1, maxNumber: 100, attemptLimit: 9 }, 100);
    for (const guess of [1, 2, 3, 4, 5, 6, 7, 8, 9]) lost = submitGuess(lost, guess).state;
    const afterLoss = storage.recordFinishedGame(
      afterWin,
      lost,
      new Date("2026-10-16T14:00:00.000Z"),
      "loss-1"
    );
    expect(afterLoss.points).toBe(4);
    expect(afterLoss.records[0]).toMatchObject({ result: "lost", pointsEarned: 0 });
  });

  it("returns false when saving fails and true when a normalized profile is saved", () => {
    expect(storage.saveGuestProfile).toBeTypeOf("function");
    const memory = new MemoryStorage();
    expect(storage.saveGuestProfile(memory, { points: 2, records: [] })).toBe(true);
    expect(JSON.parse(memory.values.get(storageKey) ?? "null")).toEqual({ points: 2, records: [] });

    memory.throwOnWrite = true;
    expect(storage.saveGuestProfile(memory, { points: 2, records: [] })).toBe(false);
  });
});
