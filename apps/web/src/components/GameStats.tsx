import type { GameState } from "@guess-number/game-core";

export function GameStats({ state }: { state: GameState }) {
  return (
    <div className="stats" aria-label="游戏进度">
      <div className="stat">
        <span>已猜次数</span>
        <strong>{state.attempts}<small>次</small></strong>
      </div>
      <div className="stat">
        <span>数字范围</span>
        <strong>{state.lowerBound}–{state.upperBound}</strong>
      </div>
      <div className="stat">
        <span>剩余机会</span>
        <strong>{state.attemptLimit - state.attempts}<small>次</small></strong>
      </div>
    </div>
  );
}
