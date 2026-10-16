import type { GameState } from "@guess-number/game-core";

const STORAGE_KEY = "number-detective.guest.v1";
const MAX_RECORDS = 200;
const MIN_NUMBER = 1;
const MAX_NUMBER = 100;
const MAX_ATTEMPTS = 9;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface GameRecord {
  id: string;
  result: "won" | "lost";
  attempts: number;
  secretNumber: number;
  guesses: number[];
  pointsEarned: 0 | 1;
  playedAt: string;
}

export interface GuestProfile {
  points: number;
  records: GameRecord[];
}

function integerInRange(value: unknown, minimum: number, maximum: number, fallback: number): number {
  const number = Number(value);
  return Number.isInteger(number)
    ? Math.max(minimum, Math.min(maximum, number))
    : fallback;
}

function normalizeDate(value: unknown): string {
  if (typeof value !== "string") return new Date(0).toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

function normalizeRecord(value: unknown, index: number): GameRecord | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const result = source.result === "won" ? "won" : "lost";
  const guesses = Array.isArray(source.guesses)
    ? source.guesses
        .map(Number)
        .filter((guess) => Number.isInteger(guess) && guess >= MIN_NUMBER && guess <= MAX_NUMBER)
        .slice(0, MAX_ATTEMPTS)
    : [];

  return {
    id: String(source.id || `recovered-${index}`),
    result,
    attempts: integerInRange(source.attempts, 1, MAX_ATTEMPTS, MAX_ATTEMPTS),
    secretNumber: integerInRange(source.secretNumber, MIN_NUMBER, MAX_NUMBER, MIN_NUMBER),
    guesses,
    pointsEarned: result === "won" ? 1 : 0,
    playedAt: normalizeDate(source.playedAt)
  };
}

function normalizeProfile(value: unknown): GuestProfile {
  if (!value || typeof value !== "object") return { points: 0, records: [] };
  const source = value as Record<string, unknown>;
  const points = Math.max(0, Math.floor(Number(source.points) || 0));
  const records = Array.isArray(source.records)
    ? source.records
        .map(normalizeRecord)
        .filter((record): record is GameRecord => record !== null)
        .slice(0, MAX_RECORDS)
    : [];
  return { points, records };
}

export function loadGuestProfile(storage: StorageLike): GuestProfile {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? normalizeProfile(JSON.parse(raw) as unknown) : { points: 0, records: [] };
  } catch {
    return { points: 0, records: [] };
  }
}

export function saveGuestProfile(storage: StorageLike, profile: GuestProfile): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(normalizeProfile(profile)));
    return true;
  } catch {
    return false;
  }
}

export function recordFinishedGame(
  profile: GuestProfile,
  state: GameState,
  now: Date,
  id: string
): GuestProfile {
  if (state.status !== "won" && state.status !== "lost") {
    throw new Error("Only a finished game can be recorded.");
  }

  const won = state.status === "won";
  const record: GameRecord = {
    id,
    result: won ? "won" : "lost",
    attempts: state.attempts,
    secretNumber: state.secretNumber,
    guesses: [...state.guesses],
    pointsEarned: won ? 1 : 0,
    playedAt: now.toISOString()
  };

  return {
    points: profile.points + record.pointsEarned,
    records: [record, ...profile.records].slice(0, MAX_RECORDS)
  };
}
