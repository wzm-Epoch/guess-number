import { createGame, submitGuess, type GameState } from "@guess-number/game-core";
import { describe, expect, it } from "vitest";

import { createInitialLocalProfile, type GameRecord, type LocalAccount } from "./local-profile";
import { rankLocalAccounts, recordFinishedGame } from "./profile-actions";

function wonGame(secret = 42): GameState {
  return submitGuess(createGame({ minNumber: 1, maxNumber: 100, attemptLimit: 9 }, secret), secret).state;
}

function lostGame(): GameState {
  let state = createGame({ minNumber: 1, maxNumber: 100, attemptLimit: 9 }, 100);
  for (const guess of [1, 2, 3, 4, 5, 6, 7, 8, 9]) state = submitGuess(state, guess).state;
  return state;
}

function registeredAccount(id: string, username: string, points = 0, records: GameRecord[] = []): LocalAccount {
  return { id, username, isGuest: false, passwordHash: `hash-${id}`, points, records };
}

describe("recordFinishedGame", () => {
  it("records a win for the current account and reports a level increase", () => {
    const state = createInitialLocalProfile();
    const result = recordFinishedGame(
      state,
      wonGame(),
      new Date("2026-10-17T12:00:00.000Z"),
      "win-1"
    );

    expect(result.reward).toEqual({
      pointsEarned: 1,
      leveledUp: true,
      previousLevel: 1,
      newLevel: 2
    });
    expect(result.state.accounts.guest.points).toBe(1);
    expect(result.state.accounts.guest.records[0]).toEqual({
      id: "win-1",
      result: "won",
      attempts: 1,
      secretNumber: 42,
      guesses: [42],
      pointsEarned: 1,
      playedAt: "2026-10-17T12:00:00.000Z"
    });
    expect(state.accounts.guest.points).toBe(0);
  });

  it("records a loss without awarding points", () => {
    const result = recordFinishedGame(
      createInitialLocalProfile(),
      lostGame(),
      new Date("2026-10-17T13:00:00.000Z"),
      "loss-1"
    );

    expect(result.reward).toEqual({
      pointsEarned: 0,
      leveledUp: false,
      previousLevel: 1,
      newLevel: 1
    });
    expect(result.state.accounts.guest.records[0]).toMatchObject({
      id: "loss-1",
      result: "lost",
      attempts: 9,
      pointsEarned: 0
    });
  });

  it("is idempotent when the same record id is submitted again", () => {
    const first = recordFinishedGame(
      createInitialLocalProfile(),
      wonGame(),
      new Date("2026-10-17T12:00:00.000Z"),
      "win-1"
    );
    const repeated = recordFinishedGame(
      first.state,
      wonGame(),
      new Date("2026-10-17T12:01:00.000Z"),
      "win-1"
    );

    expect(repeated.state).toBe(first.state);
    expect(repeated.reward).toEqual({
      pointsEarned: 0,
      leveledUp: false,
      previousLevel: 2,
      newLevel: 2
    });
    expect(repeated.state.accounts.guest.records).toHaveLength(1);
  });

  it("rejects unfinished game state", () => {
    const active = createGame({ minNumber: 1, maxNumber: 100, attemptLimit: 9 }, 42);
    expect(() => recordFinishedGame(createInitialLocalProfile(), active, new Date(), "bad"))
      .toThrow("Only a finished game can be recorded.");
  });
});

describe("rankLocalAccounts", () => {
  it("excludes guests and sorts by points, wins, then Chinese username", () => {
    const state = createInitialLocalProfile();
    const win = (id: string): GameRecord => ({
      id,
      result: "won",
      attempts: 1,
      secretNumber: 42,
      guesses: [42],
      pointsEarned: 1,
      playedAt: "2026-10-17T12:00:00.000Z"
    });
    state.accounts = {
      ...state.accounts,
      high: registeredAccount("high", "高分", 10, []),
      many: registeredAccount("many", "同分多胜", 5, [win("a"), win("b")]),
      few: registeredAccount("few", "同分少胜", 5, [win("c")])
    };

    const ranked = rankLocalAccounts(state);

    expect(ranked.map(({ username }) => username)).toEqual(["高分", "同分多胜", "同分少胜"]);
    expect(ranked.map(({ wins }) => wins)).toEqual([0, 2, 1]);
    expect(ranked.some(({ isGuest }) => isGuest)).toBe(false);
  });
});
