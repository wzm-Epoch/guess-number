import type { GameState } from "@guess-number/game-core";

import type { GameReward } from "../profile/profile-actions";

interface ResultPanelProps {
  state: GameState;
  reward: GameReward;
  blessing: string;
  onRestart: () => void;
}

export function ResultPanel({ state, reward, blessing, onRestart }: ResultPanelProps) {
  if (state.status !== "won" && state.status !== "lost") return null;
  const won = state.status === "won";
  const rewardText = won
    ? reward.leveledUp
      ? `本局 +1 积分 · 升级至 Lv.${reward.newLevel}`
      : "本局 +1 积分"
    : "本局未获得积分";

  return (
    <section className="result-panel" aria-live="polite" data-result={won ? "won" : "lost"}>
      <div className="result-icon" aria-hidden="true">{won ? "🎉" : "🍀"}</div>
      <p className="result-kicker">{won ? `${state.attempts} 次命中` : `${state.attemptLimit} 次机会已用完`}</p>
      <h2>{won ? "恭喜你，猜对了！" : "差一点点"}</h2>
      <p className="blessing">
        {won ? blessing : "别灰心，这一次的遗憾会变成下一局的好运。"}
      </p>
      <p>正确答案是 <strong>{state.secretNumber}</strong></p>
      <p className="reward-note">{rewardText}</p>
      <div className="result-actions">
        <button type="button" onClick={onRestart}>{won ? "再玩一局" : "重新挑战"}</button>
      </div>
    </section>
  );
}
