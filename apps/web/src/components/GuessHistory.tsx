import type { GameState } from "@guess-number/game-core";

export function GuessHistory({ state }: { state: GameState }) {
  return (
    <section className="history-section" aria-labelledby="guess-history-title">
      <div className="section-heading">
        <h2 id="guess-history-title">猜测记录</h2>
        <span>↑ 表示答案更大 · ↓ 表示答案更小</span>
      </div>
      <div className="history">
        {state.guesses.length === 0 ? (
          <p>你的猜测会记录在这里</p>
        ) : state.guesses.map((guess) => {
          const symbol = guess === state.secretNumber ? "✓" : guess < state.secretNumber ? "↑" : "↓";
          const outcome = guess === state.secretNumber ? "correct" : guess < state.secretNumber ? "low" : "high";
          return <span className={`guess-chip ${outcome}`} key={guess}>{guess} {symbol}</span>;
        })}
      </div>
    </section>
  );
}
