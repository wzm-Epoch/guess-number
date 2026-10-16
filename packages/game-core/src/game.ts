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
