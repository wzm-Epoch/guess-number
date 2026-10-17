import type { RefObject } from "react";

import { GUEST_ID } from "../profile/local-profile";
import type { RankedLocalAccount } from "../profile/profile-actions";
import { getLevelInfo } from "../profile/progression";
import { Dialog } from "./Dialog";

interface LeaderboardDialogProps {
  open: boolean;
  accounts: RankedLocalAccount[];
  currentAccountId: string;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}

export function LeaderboardDialog({
  open,
  accounts,
  currentAccountId,
  onClose,
  returnFocusRef
}: LeaderboardDialogProps) {
  const currentRank = accounts.findIndex((account) => account.id === currentAccountId);
  const summary = accounts.length === 0
    ? "暂无已注册玩家"
    : currentAccountId === GUEST_ID
      ? "游客暂不参与排名"
      : currentRank >= 0
        ? `当前排名第 ${currentRank + 1} 名`
        : "当前账号未进入榜单";

  return (
    <Dialog open={open} title="排行榜" onClose={onClose} returnFocusRef={returnFocusRef}>
      <div className="leaderboard-summary">
        <strong>{summary}</strong>
        <span>{accounts.length} 位玩家 · 按积分排序</span>
      </div>
      <div className="leaderboard-list">
        {accounts.length === 0 ? (
          <p className="history-empty-state">暂无已注册玩家，注册账号并猜对数字后就会出现在排行榜中。</p>
        ) : accounts.map((account, index) => (
          <article
            className={`leaderboard-item rank-${index + 1}${account.id === currentAccountId ? " current" : ""}`}
            key={account.id}
          >
            <div className="leaderboard-rank" aria-label={`第 ${index + 1} 名`}>{index + 1}</div>
            <div className="leaderboard-player">
              <strong>{account.username}</strong>
              <span>Lv.{getLevelInfo(account.points).level} · 猜中 {account.wins} 次</span>
            </div>
            <div className="leaderboard-points">{account.points} 分</div>
          </article>
        ))}
      </div>
      <p className="leaderboard-note">排行榜仅统计当前浏览器内已注册的账号；积分相同时按猜对次数排序。</p>
    </Dialog>
  );
}
