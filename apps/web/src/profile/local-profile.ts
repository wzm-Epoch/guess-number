export const GUEST_ID = "guest";
export const LOCAL_PROFILE_STORAGE_KEY = "number-detective.local-accounts.v1";

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

export interface LocalAccount {
  id: string;
  username: string;
  isGuest: boolean;
  passwordHash: string;
  points: number;
  records: GameRecord[];
}

export interface LocalProfileState {
  version: 1;
  currentAccountId: string;
  accounts: Record<string, LocalAccount>;
}

function createGuestAccount(): LocalAccount {
  return {
    id: GUEST_ID,
    username: "游客",
    isGuest: true,
    passwordHash: "",
    points: 0,
    records: []
  };
}

export function createInitialLocalProfile(): LocalProfileState {
  return {
    version: 1,
    currentAccountId: GUEST_ID,
    accounts: { [GUEST_ID]: createGuestAccount() }
  };
}

function integerInRange(value: unknown, minimum: number, maximum: number, fallback: number): number {
  const number = Number(value);
  return Number.isInteger(number)
    ? Math.max(minimum, Math.min(maximum, number))
    : fallback;
}

function normalizedDate(value: unknown): string {
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
    id: typeof source.id === "string" && source.id ? source.id : `recovered-${index}`,
    result,
    attempts: integerInRange(source.attempts, 1, MAX_ATTEMPTS, MAX_ATTEMPTS),
    secretNumber: integerInRange(source.secretNumber, MIN_NUMBER, MAX_NUMBER, MIN_NUMBER),
    guesses,
    pointsEarned: result === "won" ? 1 : 0,
    playedAt: normalizedDate(source.playedAt)
  };
}

function normalizeRegisteredAccount(id: string, value: unknown): LocalAccount | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const username = typeof source.username === "string" ? source.username.trim().slice(0, 16) : "";
  const passwordHash = typeof source.passwordHash === "string" ? source.passwordHash : "";
  if (username.length < 2 || !passwordHash) return null;

  const numericPoints = Number(source.points);
  const points = Number.isFinite(numericPoints) ? Math.max(0, Math.floor(numericPoints)) : 0;
  const records = Array.isArray(source.records)
    ? source.records
        .map(normalizeRecord)
        .filter((record): record is GameRecord => record !== null)
        .slice(0, MAX_RECORDS)
    : [];

  return { id, username, isGuest: false, passwordHash, points, records };
}

function normalizeLocalProfile(value: unknown): LocalProfileState {
  if (!value || typeof value !== "object") return createInitialLocalProfile();
  const source = value as Record<string, unknown>;
  const accountSource = source.accounts && typeof source.accounts === "object" && !Array.isArray(source.accounts)
    ? source.accounts as Record<string, unknown>
    : {};
  const accounts: Record<string, LocalAccount> = { [GUEST_ID]: createGuestAccount() };

  for (const [id, account] of Object.entries(accountSource)) {
    if (id === GUEST_ID) continue;
    const normalized = normalizeRegisteredAccount(id, account);
    if (normalized) accounts[id] = normalized;
  }

  const requestedAccountId = typeof source.currentAccountId === "string"
    ? source.currentAccountId
    : GUEST_ID;

  return {
    version: 1,
    currentAccountId: accounts[requestedAccountId] ? requestedAccountId : GUEST_ID,
    accounts
  };
}

export function loadLocalProfile(storage: StorageLike): LocalProfileState {
  try {
    const raw = storage.getItem(LOCAL_PROFILE_STORAGE_KEY);
    return raw ? normalizeLocalProfile(JSON.parse(raw) as unknown) : createInitialLocalProfile();
  } catch {
    return createInitialLocalProfile();
  }
}

export function saveLocalProfile(storage: StorageLike, state: LocalProfileState): boolean {
  try {
    storage.setItem(LOCAL_PROFILE_STORAGE_KEY, JSON.stringify(normalizeLocalProfile(state)));
    return true;
  } catch {
    return false;
  }
}
