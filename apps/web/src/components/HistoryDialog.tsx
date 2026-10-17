import type { RefObject } from "react";

import type { LocalAccount } from "../profile/local-profile";
import { Dialog } from "./Dialog";

interface HistoryDialogProps {
  open: boolean;
  profile: Pick<LocalAccount, "points" | "records">;
  ownerLabel?: string;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export function HistoryDialog({
  open,
  profile,
  ownerLabel = "游客",
  onClose,
  returnFocusRef
}: HistoryDialogProps) {
  const wins = profile.records.filter((record) => record.result === "won").length;

  return (
    <Dialog open={open} title="历史记录" onClose={onClose} returnFocusRef={returnFocusRef}>
      <div className="history-summary">
        <div aria-label="当前账号"><span>{ownerLabel}</span><small>当前账号</small></div>
        <div aria-label="猜对次数"><span>{wins}</span><small>猜对次数</small></div>
        <div aria-label="总局数"><span>{profile.records.length}</span><small>总局数</small></div>
      </div>
      <div className="record-list">
        {profile.records.length === 0 ? (
          <p className="history-empty-state">还没有历史记录，完成一局游戏后会自动保存在这里。</p>
        ) : profile.records.map((record) => (
          <article className={`record-item ${record.result}`} key={record.id}>
            <div aria-hidden="true">{record.result === "won" ? "✓" : "×"}</div>
            <div>
              <div>
                <strong>{record.result === "won" ? `第 ${record.attempts} 次猜中` : "本局未猜中"}</strong>
                <span>{record.pointsEarned > 0 ? "+1 积分" : "+0 积分"}</span>
              </div>
              <p>答案 {record.secretNumber} · 共猜 {record.guesses.length} 次</p>
              <time dateTime={record.playedAt}>{formatDate(record.playedAt)}</time>
            </div>
          </article>
        ))}
      </div>
    </Dialog>
  );
}
