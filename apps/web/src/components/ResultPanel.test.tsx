import { createGame, submitGuess, type GameState } from "@guess-number/game-core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { GameReward } from "../profile/profile-actions";
import { ResultPanel } from "./ResultPanel";

function win(): GameState {
  return submitGuess(createGame({ minNumber: 1, maxNumber: 100, attemptLimit: 9 }, 42), 42).state;
}

function loss(): GameState {
  let state = createGame({ minNumber: 1, maxNumber: 100, attemptLimit: 9 }, 100);
  for (const guess of [1, 2, 3, 4, 5, 6, 7, 8, 9]) state = submitGuess(state, guess).state;
  return state;
}

describe("ResultPanel", () => {
  it("shows the original win blessing and level-up reward", () => {
    const reward: GameReward = { pointsEarned: 1, leveledUp: true, previousLevel: 1, newLevel: 2 };
    render(<ResultPanel
      state={win()}
      reward={reward}
      blessing="一击命中，你就是今天的幸运星！"
      onRestart={vi.fn()}
    />);

    expect(screen.getByRole("heading", { name: "恭喜你，猜对了！" })).toBeInTheDocument();
    expect(screen.getByText("一击命中，你就是今天的幸运星！")).toBeInTheDocument();
    expect(screen.getByText("本局 +1 积分 · 升级至 Lv.2")).toBeInTheDocument();
  });

  it("shows the original loss encouragement without points", () => {
    const reward: GameReward = { pointsEarned: 0, leveledUp: false, previousLevel: 1, newLevel: 1 };
    render(<ResultPanel state={loss()} reward={reward} blessing="" onRestart={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "差一点点" })).toBeInTheDocument();
    expect(screen.getByText("别灰心，这一次的遗憾会变成下一局的好运。")).toBeInTheDocument();
    expect(screen.getByText("本局未获得积分")).toBeInTheDocument();
  });
});
