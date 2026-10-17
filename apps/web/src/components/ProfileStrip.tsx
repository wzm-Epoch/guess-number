import type { LocalAccount } from "../profile/local-profile";
import type { LevelInfo } from "../profile/progression";

interface ProfileStripProps {
  account: LocalAccount;
  levelInfo: LevelInfo;
}

export function ProfileStrip({ account, levelInfo }: ProfileStripProps) {
  const hint = levelInfo.nextLevel === null
    ? "已达到最高等级 Lv.10"
    : `距离 Lv.${levelInfo.nextLevel} 还差 ${levelInfo.pointsToNext} 积分`;

  return (
    <section className="profile-strip" aria-label="当前账号、积分与等级">
      <div className="level-orb" aria-label="当前等级">
        <small>等级</small>
        <strong>{levelInfo.level}</strong>
      </div>
      <div className="profile-main">
        <div className="profile-summary-line">
          <strong title={account.username}>{account.username}</strong>
          <span className="points-value">{account.points} 积分</span>
        </div>
        <div
          className="level-track"
          role="progressbar"
          aria-label="等级进度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={levelInfo.progress}
        >
          <span style={{ width: `${levelInfo.progress}%` }} />
        </div>
        <p className="level-hint">{hint}</p>
      </div>
    </section>
  );
}
