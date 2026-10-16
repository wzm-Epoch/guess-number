import { describe, expect, it } from "vitest";

import * as game from "./index";

describe("createGame", () => {
  it("creates a ready game with the configured bounds", () => {
    expect(game.createGame).toBeTypeOf("function");

    const state = game.createGame(
      { minNumber: 1, maxNumber: 100, attemptLimit: 9 },
      42
    );

    expect(state).toEqual({
      secretNumber: 42,
      minNumber: 1,
      maxNumber: 100,
      attemptLimit: 9,
      attempts: 0,
      guesses: [],
      lowerBound: 1,
      upperBound: 100,
      status: "ready"
    });
  });

  it.each([
    { minNumber: 0, maxNumber: 100, attemptLimit: 9 },
    { minNumber: 1, maxNumber: 1, attemptLimit: 9 },
    { minNumber: 1, maxNumber: 100, attemptLimit: 0 },
    { minNumber: 1.5, maxNumber: 100, attemptLimit: 9 }
  ])("rejects invalid configuration %#", (config) => {
    expect(game.GameConfigurationError).toBeTypeOf("function");
    expect(() => game.createGame(config, 42)).toThrow(game.GameConfigurationError);
  });

  it.each([0, 101, 42.5])("rejects invalid secret number %s", (secretNumber) => {
    expect(game.GameConfigurationError).toBeTypeOf("function");
    expect(() =>
      game.createGame({ minNumber: 1, maxNumber: 100, attemptLimit: 9 }, secretNumber)
    ).toThrow(game.GameConfigurationError);
  });
});

describe("submitGuess", () => {
  const config = { minNumber: 1, maxNumber: 100, attemptLimit: 9 };

  it("narrows the range across low and high guesses without mutating earlier states", () => {
    expect(game.submitGuess).toBeTypeOf("function");
    const initial = game.createGame(config, 42);

    const low = game.submitGuess(initial, 20);
    expect(low).toMatchObject({
      ok: true,
      outcome: "low",
      state: {
        attempts: 1,
        guesses: [20],
        lowerBound: 21,
        upperBound: 100,
        status: "active"
      }
    });
    expect(low.state).not.toBe(initial);
    expect(initial).toMatchObject({ attempts: 0, guesses: [], lowerBound: 1, upperBound: 100 });

    const high = game.submitGuess(low.state, 70);
    expect(high).toMatchObject({
      ok: true,
      outcome: "high",
      state: {
        attempts: 2,
        guesses: [20, 70],
        lowerBound: 21,
        upperBound: 69,
        status: "active"
      }
    });
  });

  it("wins on an exact guess", () => {
    const initial = game.createGame(config, 42);
    const result = game.submitGuess(initial, 42);

    expect(result).toMatchObject({
      ok: true,
      outcome: "correct",
      state: {
        attempts: 1,
        guesses: [42],
        lowerBound: 42,
        upperBound: 42,
        status: "won"
      }
    });
  });

  it("loses on the final incorrect guess", () => {
    let state = game.createGame(config, 100);
    for (const guess of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const result = game.submitGuess(state, guess);
      expect(result.ok).toBe(true);
      state = result.state;
    }

    const result = game.submitGuess(state, 9);
    expect(result).toMatchObject({
      ok: true,
      outcome: "lost",
      state: { attempts: 9, status: "lost", lowerBound: 10, upperBound: 100 }
    });
  });

  it.each([
    [1.5, "not-integer"],
    [Number.NaN, "not-integer"],
    [0, "out-of-range"],
    [101, "out-of-range"]
  ] as const)("rejects invalid guess %s as %s without changing state", (guess, error) => {
    const initial = game.createGame(config, 42);
    const result = game.submitGuess(initial, guess);

    expect(result).toEqual({ ok: false, error, state: initial });
    expect(result.state).toBe(initial);
  });

  it("rejects a repeated guess without changing state", () => {
    const first = game.submitGuess(game.createGame(config, 42), 20).state;
    const result = game.submitGuess(first, 20);

    expect(result).toEqual({ ok: false, error: "duplicate", state: first });
    expect(result.state).toBe(first);
  });

  it.each([
    [42, "won"],
    [9, "lost"]
  ] as const)("rejects guesses after a %s game", (lastGuess, status) => {
    let state = game.createGame(config, lastGuess === 42 ? 42 : 100);
    if (status === "won") {
      state = game.submitGuess(state, lastGuess).state;
    } else {
      for (const guess of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
        state = game.submitGuess(state, guess).state;
      }
    }

    const result = game.submitGuess(state, 50);
    expect(result).toEqual({ ok: false, error: "game-over", state });
    expect(result.state).toBe(state);
  });
});
