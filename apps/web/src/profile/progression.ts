export const LEVEL_MIN_POINTS = [0, 1, 3, 7, 15, 31, 63, 127, 255, 511] as const;

export interface LevelInfo {
  level: number;
  progress: number;
  pointsToNext: number;
  nextLevel: number | null;
}

const blessingSets = {
  firstTry: [
    "一击命中，你就是今天的幸运星！",
    "开局即巅峰，这份直觉也太准啦！",
    "第一次就猜中，好运正在闪闪发光！"
  ],
  quick: [
    "眼力和运气都满分，太棒了！",
    "思路清晰，你离答案近得刚刚好！",
    "漂亮！这个数字果然逃不过你的眼睛。"
  ],
  steady: [
    "稳稳拿下，胜利属于坚持到最后的你！",
    "判断越来越准，恭喜成功解锁答案！",
    "好眼力！每一次尝试都没有白费。"
  ],
  clutch: [
    "绝地反击，最后关头命中啦！",
    "惊险又精彩，幸运女神站在你这边！",
    "沉住气就赢了，这一局太漂亮了！"
  ]
} as const;

export function getLevelInfo(points: unknown): LevelInfo {
  const numericPoints = Number(points);
  const safePoints = Number.isFinite(numericPoints)
    ? Math.max(0, Math.floor(numericPoints))
    : 0;
  let level = 1;

  for (let index = 1; index < LEVEL_MIN_POINTS.length; index += 1) {
    if (safePoints >= LEVEL_MIN_POINTS[index]) level = index + 1;
  }

  if (level >= LEVEL_MIN_POINTS.length) {
    return { level: 10, progress: 100, pointsToNext: 0, nextLevel: null };
  }

  const currentLevelPoints = LEVEL_MIN_POINTS[level - 1];
  const nextLevelPoints = LEVEL_MIN_POINTS[level];
  const progress = ((safePoints - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;

  return {
    level,
    progress: Math.max(0, Math.min(100, progress)),
    pointsToNext: nextLevelPoints - safePoints,
    nextLevel: level + 1
  };
}

export function getBlessing(attempts: number, random: () => number = Math.random): string {
  const safeAttempts = Math.max(1, Math.min(9, Math.floor(Number(attempts) || 1)));
  const set = safeAttempts === 1
    ? blessingSets.firstTry
    : safeAttempts <= 3
      ? blessingSets.quick
      : safeAttempts <= 6
        ? blessingSets.steady
        : blessingSets.clutch;
  const randomValue = Number(random());
  const safeRandom = Number.isFinite(randomValue) ? Math.max(0, Math.min(0.999999999999, randomValue)) : 0;
  return set[Math.floor(safeRandom * set.length)];
}
