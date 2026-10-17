import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { LocalAccount } from "../profile/local-profile";
import { ProfileStrip } from "./ProfileStrip";

const account: LocalAccount = {
  id: "user-1",
  username: "Alice",
  isGuest: false,
  passwordHash: "hash",
  points: 31,
  records: []
};

describe("ProfileStrip", () => {
  it("shows account points, level, progress, and the next threshold", () => {
    render(<ProfileStrip
      account={account}
      levelInfo={{ level: 6, progress: 0, pointsToNext: 32, nextLevel: 7 }}
    />);

    expect(screen.getByLabelText("当前等级")).toHaveTextContent("6");
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("31 积分")).toBeInTheDocument();
    expect(screen.getByText("距离 Lv.7 还差 32 积分")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("shows the maximum-level message", () => {
    render(<ProfileStrip
      account={{ ...account, points: 511 }}
      levelInfo={{ level: 10, progress: 100, pointsToNext: 0, nextLevel: null }}
    />);

    expect(screen.getByText("已达到最高等级 Lv.10")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});
