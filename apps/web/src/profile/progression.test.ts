import { describe, expect, it } from "vitest";

import { getBlessing, getLevelInfo } from "./progression";

describe("getLevelInfo", () => {
  it.each([
    [0, { level: 1, progress: 0, pointsToNext: 1, nextLevel: 2 }],
    [1, { level: 2, progress: 0, pointsToNext: 2, nextLevel: 3 }],
    [31, { level: 6, progress: 0, pointsToNext: 32, nextLevel: 7 }],
    [47, { level: 6, progress: 50, pointsToNext: 16, nextLevel: 7 }],
    [511, { level: 10, progress: 100, pointsToNext: 0, nextLevel: null }],
    [999, { level: 10, progress: 100, pointsToNext: 0, nextLevel: null }]
  ])("maps %p points to the expected level progress", (points, expected) => {
    expect(getLevelInfo(points)).toEqual(expected);
  });

  it("normalizes invalid, negative, and fractional values", () => {
    expect(getLevelInfo("not-a-number")).toEqual({
      level: 1,
      progress: 0,
      pointsToNext: 1,
      nextLevel: 2
    });
    expect(getLevelInfo(-10)).toEqual(getLevelInfo(0));
    expect(getLevelInfo(3.9)).toEqual(getLevelInfo(3));
  });
});

describe("getBlessing", () => {
  it.each([
    [1, "一击命中，你就是今天的幸运星！"],
    [2, "眼力和运气都满分，太棒了！"],
    [4, "稳稳拿下，胜利属于坚持到最后的你！"],
    [7, "绝地反击，最后关头命中啦！"]
  ])("uses the original blessing tier for %p attempts", (attempts, expected) => {
    expect(getBlessing(attempts, () => 0)).toBe(expected);
  });

  it("clamps invalid attempt counts and random values", () => {
    expect(getBlessing(0, () => -1)).toBe("一击命中，你就是今天的幸运星！");
    expect(getBlessing(99, () => 1)).toBe("沉住气就赢了，这一局太漂亮了！");
  });
});
