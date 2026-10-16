import { render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import type { GuestProfile } from "../storage/guest-profile";
import * as historyModule from "./HistoryDialog";

function Harness({ profile, ownerLabel = "游客" }: { profile: GuestProfile; ownerLabel?: string }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const HistoryDialog = historyModule.HistoryDialog;
  return (
    <>
      <button ref={triggerRef} type="button">战绩</button>
      {typeof HistoryDialog === "function" ? (
        <HistoryDialog
          open
          profile={profile}
          ownerLabel={ownerLabel}
          onClose={vi.fn()}
          returnFocusRef={triggerRef}
        />
      ) : null}
    </>
  );
}

describe("HistoryDialog", () => {
  it("shows an empty state and zero summary", () => {
    expect(historyModule.HistoryDialog).toBeTypeOf("function");
    render(<Harness profile={{ points: 0, records: [] }} />);
    expect(screen.getByRole("dialog", { name: "历史记录" })).toBeInTheDocument();
    expect(screen.getByText("还没有历史记录，完成一局游戏后会自动保存在这里。")).toBeInTheDocument();
    expect(screen.getByLabelText("总局数")).toHaveTextContent("0");
    expect(screen.getByLabelText("猜对次数")).toHaveTextContent("0");
  });

  it("renders normalized records, summary counts, and HTML-shaped text literally", () => {
    const profile: GuestProfile = {
      points: 1,
      records: [
        {
          id: "win-1",
          result: "won",
          attempts: 2,
          secretNumber: 42,
          guesses: [20, 42],
          pointsEarned: 1,
          playedAt: "2026-10-16T13:00:00.000Z"
        },
        {
          id: "loss-1",
          result: "lost",
          attempts: 9,
          secretNumber: 100,
          guesses: [1, 2, 3, 4, 5, 6, 7, 8, 9],
          pointsEarned: 0,
          playedAt: "2026-10-16T14:00:00.000Z"
        }
      ]
    };
    const hostileLabel = '<img src=x onerror="alert(1)">';
    render(<Harness profile={profile} ownerLabel={hostileLabel} />);

    expect(screen.getByText(hostileLabel)).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByLabelText("总局数")).toHaveTextContent("2");
    expect(screen.getByLabelText("猜对次数")).toHaveTextContent("1");
    expect(screen.getByText("第 2 次猜中")).toBeInTheDocument();
    expect(screen.getByText("答案 42 · 共猜 2 次")).toBeInTheDocument();
    expect(screen.getByText("+1 积分")).toBeInTheDocument();
    expect(screen.getByText("本局未猜中")).toBeInTheDocument();
  });
});
