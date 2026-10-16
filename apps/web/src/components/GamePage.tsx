import { useMemo, useRef, useState } from "react";

import { createRandomSecret } from "../game/random-secret";
import { useSinglePlayerGame } from "../game/use-single-player-game";
import type { StorageLike } from "../storage/guest-profile";
import { GameFeedback } from "./GameFeedback";
import { GameStats } from "./GameStats";
import { GuessForm } from "./GuessForm";
import { GuessHistory } from "./GuessHistory";
import { HistoryDialog } from "./HistoryDialog";
import { ResultPanel } from "./ResultPanel";

const gameConfig = { minNumber: 1, maxNumber: 100, attemptLimit: 9 } as const;

export interface GamePageProps {
  storage?: StorageLike;
  createSecret?: () => number;
  now?: () => Date;
  createRecordId?: () => string;
}

function defaultRecordId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `record-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function GamePage({
  storage = window.localStorage,
  createSecret,
  now = () => new Date(),
  createRecordId = defaultRecordId
}: GamePageProps) {
  const [inputValue, setInputValue] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyTriggerRef = useRef<HTMLButtonElement>(null);
  const secretFactory = useMemo(
    () => createSecret ?? (() => createRandomSecret(1, 100, Math.random)),
    [createSecret]
  );
  const game = useSinglePlayerGame({
    config: gameConfig,
    createSecret: secretFactory,
    storage,
    now,
    createRecordId
  });

  function handleChange(value: string) {
    setInputValue(value);
    game.clearError();
  }

  function handleSubmit() {
    if (game.submit(inputValue)) setInputValue("");
  }

  function handleRestart() {
    game.restart();
    setInputValue("");
  }

  const isOver = game.state.status === "won" || game.state.status === "lost";

  return (
    <main className="game-shell">
      <section className="game-card" aria-labelledby="game-title">
        <header className="topbar">
          <div className="brand">
            <span aria-hidden="true">🎯</span>
            <div>
              <p>Number Detective</p>
              <h1 id="game-title">数字侦探</h1>
            </div>
          </div>
          <div className="top-actions">
            <button ref={historyTriggerRef} type="button" onClick={() => setHistoryOpen(true)}>战绩</button>
            <button type="button" onClick={handleRestart}>重开</button>
          </div>
        </header>

        <p className="intro">我在 <strong>1–100</strong> 之间藏了一个数字，你有 <strong>9 次机会</strong>找到它。</p>
        <section className="profile-strip" aria-label="游客积分">
          <strong>游客</strong>
          <span>{game.profile.points} 积分</span>
        </section>

        <GameFeedback feedback={game.feedback} />
        <GameStats state={game.state} />
        <GuessForm
          value={inputValue}
          disabled={isOver}
          error={game.error}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />

        <section className="chance-section" aria-label="机会使用情况">
          <div className="chance-dots">
            {Array.from({ length: game.state.attemptLimit }, (_, index) => (
              <span
                className={index < game.state.attempts ? "chance-dot used" : "chance-dot"}
                aria-label={`第 ${index + 1} 次机会${index < game.state.attempts ? "已使用" : "未使用"}`}
                key={index}
              />
            ))}
          </div>
        </section>

        <GuessHistory state={game.state} />
        <ResultPanel state={game.state} onRestart={handleRestart} />
        <HistoryDialog
          open={historyOpen}
          profile={game.profile}
          onClose={() => setHistoryOpen(false)}
          returnFocusRef={historyTriggerRef}
        />
      </section>
    </main>
  );
}
