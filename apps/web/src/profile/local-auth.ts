import { GUEST_ID, type LocalAccount, type LocalProfileState } from "./local-profile";

export interface RegisterInput {
  username: string;
  password: string;
  confirmation: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface AuthDependencies {
  createAccountId: () => string;
  hashPassword: (password: string) => Promise<string>;
}

export type AuthResult =
  | { ok: true; state: LocalProfileState }
  | { ok: false; error: string };

function normalizedUsername(username: string): string {
  return username.trim();
}

function usernameKey(username: string): string {
  return normalizedUsername(username).toLocaleLowerCase("zh-CN");
}

function validateUsername(username: string): string | null {
  const length = normalizedUsername(username).length;
  return length < 2 || length > 16 ? "用户名需要 2–16 个字符。" : null;
}

function validatePassword(password: string): string | null {
  return password.length < 4 || password.length > 32 ? "密码需要 4–32 个字符。" : null;
}

function registeredAccounts(state: LocalProfileState): LocalAccount[] {
  return Object.values(state.accounts).filter((account) => !account.isGuest);
}

export async function registerLocalAccount(
  state: LocalProfileState,
  input: RegisterInput,
  dependencies: AuthDependencies
): Promise<AuthResult> {
  const usernameError = validateUsername(input.username);
  if (usernameError) return { ok: false, error: usernameError };
  const passwordError = validatePassword(input.password);
  if (passwordError) return { ok: false, error: passwordError };
  if (input.confirmation !== input.password) {
    return { ok: false, error: "两次输入的密码不一致。" };
  }

  const key = usernameKey(input.username);
  if (registeredAccounts(state).some((account) => usernameKey(account.username) === key)) {
    return { ok: false, error: "这个用户名已经注册过了。" };
  }

  const id = dependencies.createAccountId();
  const account: LocalAccount = {
    id,
    username: normalizedUsername(input.username),
    isGuest: false,
    passwordHash: await dependencies.hashPassword(input.password),
    points: 0,
    records: []
  };

  return {
    ok: true,
    state: {
      ...state,
      currentAccountId: id,
      accounts: { ...state.accounts, [id]: account }
    }
  };
}

export async function loginLocalAccount(
  state: LocalProfileState,
  input: LoginInput,
  dependencies: Pick<AuthDependencies, "hashPassword">
): Promise<AuthResult> {
  const usernameError = validateUsername(input.username);
  if (usernameError) return { ok: false, error: usernameError };
  const passwordError = validatePassword(input.password);
  if (passwordError) return { ok: false, error: passwordError };

  const key = usernameKey(input.username);
  const account = registeredAccounts(state).find((candidate) => usernameKey(candidate.username) === key);
  if (!account || account.passwordHash !== await dependencies.hashPassword(input.password)) {
    return { ok: false, error: "用户名或密码不正确。" };
  }

  return { ok: true, state: { ...state, currentAccountId: account.id } };
}

export function logoutLocalAccount(state: LocalProfileState): LocalProfileState {
  return { ...state, currentAccountId: GUEST_ID };
}

export async function hashLocalPassword(
  password: string,
  subtle: SubtleCrypto | null | undefined = globalThis.crypto?.subtle
): Promise<string> {
  const source = `number-detective-v2:${password}`;

  if (subtle && typeof TextEncoder !== "undefined") {
    try {
      const bytes = new TextEncoder().encode(source);
      const digest = await subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    } catch {
      // Local accounts remain usable when Web Crypto is unavailable.
    }
  }

  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `local_${(hash >>> 0).toString(16)}`;
}
