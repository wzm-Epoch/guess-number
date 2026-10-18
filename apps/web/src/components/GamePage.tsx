import { useCallback, useMemo, useRef, useState } from "react";

import { createRandomSecret } from "../game/random-secret";
import { useSinglePlayerGame } from "../game/use-single-player-game";
import type { StorageLike } from "../profile/local-profile";
import type { GameReward } from "../profile/profile-actions";
import { getBlessing } from "../profile/progression";
import { useLocalProfile } from "../profile/use-local-profile";
import { AccountDialog } from "./AccountDialog";
import { ConfettiLayer } from "./ConfettiLayer";
import { GameFeedback } from "./GameFeedback";
import { GameStats } from "./GameStats";
import { GuessForm } from "./GuessForm";
import { GuessHistory } from "./GuessHistory";
import { HistoryDialog } from "./HistoryDialog";
import { LeaderboardDialog } from "./LeaderboardDialog";
import { ProfileStrip } from "./ProfileStrip";
import { ResultPanel } from "./ResultPanel";

const gameConfig = { minNumber: 1, maxNumber: 100, attemptLimit: 9 } as const;
type OpenDialog = "account" | "leaderboard" | "history" | null;

export interface GamePageProps {
  storage?: StorageLike;
  createSecret?: () => number;
  now?: () => Date;
  createRecordId?: () => string;
  createAccountId?: () => string;
  hashPassword?: (password: string) => Promise<string>;
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
  createRecordId = defaultRecordId,
  createAccountId,
  hashPassword
}: GamePageProps) {
  const [inputValue, setInputValue] = useState("");
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const [completion, setCompletion] = useState<{ reward: GameReward; blessing: string } | null>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const leaderboardTriggerRef = useRef<HTMLButtonElement>(null);
  const historyTriggerRef = useRef<HTMLButtonElement>(null);
  const secretFactory = useMemo(
    () => createSecret ?? (() => createRandomSecret(1, 100, Math.random)),
    [createSecret]
  );
  const profile = useLocalProfile({ storage, createAccountId, hashPassword });
  const handleFinished = useCallback((finishedState: Parameters<typeof profile.recordGame>[0]) => {
    const reward = profile.recordGame(finishedState, now(), createRecordId());
    setCompletion({
      reward,
      blessing: finishedState.status === "won" ? getBlessing(finishedState.attempts) : ""
    });
  }, [createRecordId, now, profile.recordGame]);
  const game = useSinglePlayerGame({
    config: gameConfig,
    createSecret: secretFactory,
    onFinished: handleFinished
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
    setCompletion(null);
  }

  const isOver = game.state.status === "won" || game.state.status === "lost";

  async function handleLogin(input: Parameters<typeof profile.login>[0]) {
    const result = await profile.login(input);
    if (result.ok) setOpenDialog(null);
    return result;
  }

  async function handleRegister(input: Parameters<typeof profile.register>[0]) {
    const result = await profile.register(input);
    if (result.ok) setOpenDialog(null);
    return result;
  }

  function handleLogout() {
    profile.logout();
    setOpenDialog(null);
  }

  return (
    <main className="game-shell">
      <section className="game-card" aria-labelledby="game-title">
        <ConfettiLayer active={game.state.status === "won"} />
        <header className="topbar">
          <div className="brand">
            <span aria-hidden="true">🎯</span>
            <div>
              <p>Number Detective</p>
              <h1 id="game-title">数字侦探</h1>
            </div>
          </div>
          <div className="top-actions" aria-label="游戏操作">
            <button ref={accountTriggerRef} type="button" onClick={() => setOpenDialog("account")}>
              {profile.currentAccount.isGuest ? "登录" : profile.currentAccount.username}
            </button>
            <button ref={leaderboardTriggerRef} type="button" onClick={() => setOpenDialog("leaderboard")}>排行</button>
            <button ref={historyTriggerRef} type="button" onClick={() => setOpenDialog("history")}>战绩</button>
            <button type="button" onClick={handleRestart}>重开</button>
          </div>
        </header>

        <p className="intro">我在 <strong>1–100</strong> 之间藏了一个数字，你有 <strong>9 次机会</strong>找到它。</p>
        {profile.persistenceWarning ? <p className="persistence-warning" role="alert">{profile.persistenceWarning}</p> : null}
        <ProfileStrip account={profile.currentAccount} levelInfo={profile.levelInfo} />

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
        {completion ? (
          <ResultPanel
            state={game.state}
            reward={completion.reward}
            blessing={completion.blessing}
            onRestart={handleRestart}
          />
        ) : null}
        <AccountDialog
          open={openDialog === "account"}
          account={profile.currentAccount}
          levelInfo={profile.levelInfo}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onLogout={handleLogout}
          onClose={() => setOpenDialog(null)}
          returnFocusRef={accountTriggerRef}
        />
        <LeaderboardDialog
          open={openDialog === "leaderboard"}
          accounts={profile.rankedAccounts}
          currentAccountId={profile.currentAccount.id}
          onClose={() => setOpenDialog(null)}
          returnFocusRef={leaderboardTriggerRef}
        />
        <HistoryDialog
          open={openDialog === "history"}
          profile={profile.currentAccount}
          ownerLabel={profile.currentAccount.username}
          onClose={() => setOpenDialog(null)}
          returnFocusRef={historyTriggerRef}
        />
      </section>
    </main>
  );
}
