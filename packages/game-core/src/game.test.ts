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
