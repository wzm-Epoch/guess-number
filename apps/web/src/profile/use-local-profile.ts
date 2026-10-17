import type { GameState } from "@guess-number/game-core";
import { useCallback, useMemo, useState } from "react";

import {
  hashLocalPassword,
  loginLocalAccount,
  logoutLocalAccount,
  registerLocalAccount,
  type AuthResult,
  type LoginInput,
  type RegisterInput
} from "./local-auth";
import {
  loadLocalProfile,
  saveLocalProfile,
  type LocalProfileState,
  type StorageLike
} from "./local-profile";
import {
  getCurrentAccount,
  rankLocalAccounts,
  recordFinishedGame,
  type GameReward
} from "./profile-actions";
import { getLevelInfo } from "./progression";

const PERSISTENCE_WARNING = "本机数据无法保存，关闭页面后可能丢失。";

export interface UseLocalProfileOptions {
  storage: StorageLike;
  createAccountId?: () => string;
  hashPassword?: (password: string) => Promise<string>;
}

function defaultAccountId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `user-${crypto.randomUUID()}`
    : `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useLocalProfile({
  storage,
  createAccountId = defaultAccountId,
  hashPassword = hashLocalPassword
}: UseLocalProfileOptions) {
  const [state, setState] = useState<LocalProfileState>(() => loadLocalProfile(storage));
  const [persistenceWarning, setPersistenceWarning] = useState("");

  const persistState = useCallback((nextState: LocalProfileState) => {
    setState(nextState);
    setPersistenceWarning(saveLocalProfile(storage, nextState) ? "" : PERSISTENCE_WARNING);
  }, [storage]);

  const register = useCallback(async (input: RegisterInput): Promise<AuthResult> => {
    const result = await registerLocalAccount(state, input, { createAccountId, hashPassword });
    if (result.ok) persistState(result.state);
    return result;
  }, [createAccountId, hashPassword, persistState, state]);

  const login = useCallback(async (input: LoginInput): Promise<AuthResult> => {
    const result = await loginLocalAccount(state, input, { hashPassword });
    if (result.ok) persistState(result.state);
    return result;
  }, [hashPassword, persistState, state]);

  const logout = useCallback(() => {
    persistState(logoutLocalAccount(state));
  }, [persistState, state]);

  const recordGame = useCallback((gameState: GameState, now: Date, recordId: string): GameReward => {
    const result = recordFinishedGame(state, gameState, now, recordId);
    if (result.state !== state) persistState(result.state);
    return result.reward;
  }, [persistState, state]);

  const currentAccount = getCurrentAccount(state);
  const levelInfo = getLevelInfo(currentAccount.points);
  const rankedAccounts = useMemo(() => rankLocalAccounts(state), [state]);

  return {
    state,
    currentAccount,
    levelInfo,
    rankedAccounts,
    persistenceWarning,
    register,
    login,
    logout,
    recordGame
  };
}
