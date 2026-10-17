import type { GameState } from "@guess-number/game-core";

import { GUEST_ID, type GameRecord, type LocalAccount, type LocalProfileState } from "./local-profile";
import { getLevelInfo } from "./progression";

const MAX_RECORDS = 200;
const MAX_RANKED_ACCOUNTS = 100;

export interface GameReward {
  pointsEarned: 0 | 1;
  leveledUp: boolean;
  previousLevel: number;
  newLevel: number;
}

export interface RecordGameResult {
  state: LocalProfileState;
  reward: GameReward;
}

export interface RankedLocalAccount extends LocalAccount {
  wins: number;
}

export function getCurrentAccount(state: LocalProfileState): LocalAccount {
  return state.accounts[state.currentAccountId] ?? state.accounts[GUEST_ID];
}

function unchangedReward(account: LocalAccount): GameReward {
  const level = getLevelInfo(account.points).level;
  return { pointsEarned: 0, leveledUp: false, previousLevel: level, newLevel: level };
}

export function recordFinishedGame(
  state: LocalProfileState,
  gameState: GameState,
  now: Date,
  recordId: string
): RecordGameResult {
  if (gameState.status !== "won" && gameState.status !== "lost") {
    throw new Error("Only a finished game can be recorded.");
  }

  const account = getCurrentAccount(state);
  if (account.records.some((record) => record.id === recordId)) {
    return { state, reward: unchangedReward(account) };
  }

  const previousLevel = getLevelInfo(account.points).level;
  const pointsEarned = gameState.status === "won" ? 1 : 0;
  const nextPoints = account.points + pointsEarned;
  const newLevel = getLevelInfo(nextPoints).level;
  const record: GameRecord = {
    id: recordId,
    result: gameState.status,
    attempts: gameState.attempts,
    secretNumber: gameState.secretNumber,
    guesses: [...gameState.guesses],
    pointsEarned,
    playedAt: now.toISOString()
  };
  const nextAccount: LocalAccount = {
    ...account,
    points: nextPoints,
    records: [record, ...account.records].slice(0, MAX_RECORDS)
  };

  return {
    state: {
      ...state,
      accounts: { ...state.accounts, [account.id]: nextAccount }
    },
    reward: {
      pointsEarned,
      leveledUp: newLevel > previousLevel,
      previousLevel,
      newLevel
    }
  };
}

export function rankLocalAccounts(state: LocalProfileState): RankedLocalAccount[] {
  return Object.values(state.accounts)
    .filter((account) => !account.isGuest)
    .map((account) => ({
      ...account,
      wins: account.records.filter((record) => record.result === "won").length
    }))
    .sort((left, right) => {
      if (right.points !== left.points) return right.points - left.points;
      if (right.wins !== left.wins) return right.wins - left.wins;
      return left.username.localeCompare(right.username, "zh-CN");
    })
    .slice(0, MAX_RANKED_ACCOUNTS);
}
