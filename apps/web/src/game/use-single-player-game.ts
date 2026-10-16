import { createGame, submitGuess, type GameConfig, type GameState } from "@guess-number/game-core";
import { useCallback, useState } from "react";

import {
  loadGuestProfile,
  recordFinishedGame,
  saveGuestProfile,
  type GuestProfile,
  type StorageLike
} from "../storage/guest-profile";

export interface GameFeedbackState {
  tone: "ready" | "low" | "high" | "correct" | "lost";
  symbol: string;
  title: string;
  detail: string;
}

export interface SinglePlayerGameOptions {
  config: GameConfig;
  createSecret: () => number;
  storage: StorageLike;
  now: () => Date;
  createRecordId: () => string;
}

const readyFeedback: GameFeedbackState = {
  tone: "ready",
  symbol: "🤔",
  title: "等你出手",
  detail: "输入一个数字，我会告诉你大了还是小了。"
};

function feedbackFor(state: GameState, outcome: "low" | "high" | "correct" | "lost"): GameFeedbackState {
  if (outcome === "correct") {
    return {
      tone: "correct",
      symbol: "🎉",
      title: "猜对啦！+1 积分",
      detail: `数字就是 ${state.secretNumber}。`
    };
  }
  if (outcome === "lost") {
    return {
      tone: "lost",
      symbol: "🍀",
      title: "机会用完了",
      detail: `正确答案是 ${state.secretNumber}。`
    };
  }
  if (outcome === "low") {
    return {
      tone: "low",
      symbol: "⬆️",
      title: "数字有点小",
      detail: `区间收窄为 ${state.lowerBound}–${state.upperBound}，再往大一点猜。`
    };
  }
  return {
    tone: "high",
    symbol: "⬇️",
    title: "数字有点大",
    detail: `区间收窄为 ${state.lowerBound}–${state.upperBound}，试着往小一点猜。`
  };
}

export function useSinglePlayerGame(options: SinglePlayerGameOptions) {
  const { config, createSecret, storage, now, createRecordId } = options;
  const [state, setState] = useState(() => createGame(config, createSecret()));
  const [profile, setProfile] = useState<GuestProfile>(() => loadGuestProfile(storage));
  const [feedback, setFeedback] = useState<GameFeedbackState>(readyFeedback);
  const [error, setError] = useState("");

  const restart = useCallback(() => {
    setState(createGame(config, createSecret()));
    setFeedback(readyFeedback);
    setError("");
  }, [config, createSecret]);

  const submit = useCallback((rawValue: string): boolean => {
    const trimmed = rawValue.trim();
    if (!/^\d+$/.test(trimmed)) {
      setError(`请输入 ${config.minNumber} 到 ${config.maxNumber} 之间的整数。`);
      return false;
    }

    const guess = Number(trimmed);
    const result = submitGuess(state, guess);
    if (!result.ok) {
      const messages = {
        "not-integer": `请输入 ${config.minNumber} 到 ${config.maxNumber} 之间的整数。`,
        "out-of-range": `数字需要落在 ${config.minNumber} 到 ${config.maxNumber} 之间哦。`,
        duplicate: "这个数字已经猜过啦，换一个试试。",
        "game-over": "本局已经结束，请重新开始。"
      } as const;
      setError(messages[result.error]);
      return false;
    }

    setError("");
    setState(result.state);
    setFeedback(feedbackFor(result.state, result.outcome));

    if (result.state.status === "won" || result.state.status === "lost") {
      setProfile((currentProfile) => {
        const nextProfile = recordFinishedGame(
          currentProfile,
          result.state,
          now(),
          createRecordId()
        );
        saveGuestProfile(storage, nextProfile);
        return nextProfile;
      });
    }

    return true;
  }, [config.maxNumber, config.minNumber, createRecordId, now, state, storage]);

  const clearError = useCallback(() => setError(""), []);

  return { state, profile, feedback, error, submit, restart, clearError };
}
