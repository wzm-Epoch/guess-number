export interface GameConfig {
  minNumber: number;
  maxNumber: number;
  attemptLimit: number;
}

export type GameStatus = "ready" | "active" | "won" | "lost";

export interface GameState extends GameConfig {
  secretNumber: number;
  attempts: number;
  guesses: readonly number[];
  lowerBound: number;
  upperBound: number;
  status: GameStatus;
}

export type GuessError = "not-integer" | "out-of-range" | "duplicate" | "game-over";

export type GuessOutcome = "low" | "high" | "correct" | "lost";

export type GuessResult =
  | { ok: false; error: GuessError; state: GameState }
  | { ok: true; outcome: GuessOutcome; state: GameState };

export type GameConfigurationErrorCode = "invalid-config" | "invalid-secret";

export class GameConfigurationError extends RangeError {
  readonly code: GameConfigurationErrorCode;

  constructor(code: GameConfigurationErrorCode, message: string) {
    super(message);
    this.name = "GameConfigurationError";
    this.code = code;
  }
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

export function createGame(config: GameConfig, secretNumber: number): GameState {
  const { minNumber, maxNumber, attemptLimit } = config;

  if (
    !isPositiveInteger(minNumber) ||
    !isPositiveInteger(maxNumber) ||
    !isPositiveInteger(attemptLimit) ||
    minNumber >= maxNumber
  ) {
    throw new GameConfigurationError(
      "invalid-config",
      "Game bounds and attempt limit must be positive integers with minNumber below maxNumber."
    );
  }

  if (
    !Number.isInteger(secretNumber) ||
    secretNumber < minNumber ||
    secretNumber > maxNumber
  ) {
    throw new GameConfigurationError(
      "invalid-secret",
      "The secret number must be an integer inside the configured range."
    );
  }

  return {
    secretNumber,
    minNumber,
    maxNumber,
    attemptLimit,
    attempts: 0,
    guesses: [],
    lowerBound: minNumber,
    upperBound: maxNumber,
    status: "ready"
  };
}

export function submitGuess(state: GameState, guess: number): GuessResult {
  if (state.status === "won" || state.status === "lost") {
    return { ok: false, error: "game-over", state };
  }

  if (!Number.isInteger(guess)) {
    return { ok: false, error: "not-integer", state };
  }

  if (guess < state.minNumber || guess > state.maxNumber) {
    return { ok: false, error: "out-of-range", state };
  }

  if (state.guesses.includes(guess)) {
    return { ok: false, error: "duplicate", state };
  }

  const attempts = state.attempts + 1;
  const guesses = [...state.guesses, guess];

  if (guess === state.secretNumber) {
    return {
      ok: true,
      outcome: "correct",
      state: {
        ...state,
        attempts,
        guesses,
        lowerBound: guess,
        upperBound: guess,
        status: "won"
      }
    };
  }

  const outcome: GuessOutcome = attempts >= state.attemptLimit
    ? "lost"
    : guess < state.secretNumber
      ? "low"
      : "high";

  return {
    ok: true,
    outcome,
    state: {
      ...state,
      attempts,
      guesses,
      lowerBound: guess < state.secretNumber ? Math.max(state.lowerBound, guess + 1) : state.lowerBound,
      upperBound: guess > state.secretNumber ? Math.min(state.upperBound, guess - 1) : state.upperBound,
      status: outcome === "lost" ? "lost" : "active"
    }
  };
}
