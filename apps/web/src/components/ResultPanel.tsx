import type { GameState } from "@guess-number/game-core";

interface ResultPanelProps {
  state: GameState;
  onRestart: () => void;
}

export function ResultPanel({ state, onRestart }: ResultPanelProps) {
  if (state.status !== "won" && state.status !== "lost") return null;
  const won = state.status === "won";

  return (
    <section className="result-panel" aria-live="polite" data-result={won ? "won" : "lost"}>
      <div aria-hidden="true">{won ? "🎉" : "🍀"}</div>
      <p>{won ? `${state.attempts} 次命中` : `${state.attemptLimit} 次机会已用完`}</p>
      <h2>{won ? "恭喜你，猜对了！" : "差一点点"}</h2>
      <p>正确答案是 <strong>{state.secretNumber}</strong></p>
      <p>{won ? "本局 +1 积分" : "本局未获得积分"}</p>
      <button type="button" onClick={onRestart}>{won ? "再玩一局" : "重新挑战"}</button>
    </section>
  );
}
