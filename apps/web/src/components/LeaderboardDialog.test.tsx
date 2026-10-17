import { render, screen, within } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import type { RankedLocalAccount } from "../profile/profile-actions";
import { LeaderboardDialog } from "./LeaderboardDialog";

const accounts: RankedLocalAccount[] = [
  { id: "high", username: "高分", isGuest: false, passwordHash: "h", points: 10, records: [], wins: 0 },
  { id: "many", username: "同分多胜", isGuest: false, passwordHash: "h", points: 5, records: [], wins: 2 },
  { id: "few", username: "同分少胜", isGuest: false, passwordHash: "h", points: 5, records: [], wins: 1 }
];

function Harness({ currentAccountId, rankedAccounts = accounts }: {
  currentAccountId: string;
  rankedAccounts?: RankedLocalAccount[];
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={triggerRef} type="button">排行</button>
      <LeaderboardDialog
        open
        accounts={rankedAccounts}
        currentAccountId={currentAccountId}
        onClose={vi.fn()}
        returnFocusRef={triggerRef}
      />
    </>
  );
}

describe("LeaderboardDialog", () => {
  it("renders ranked accounts in supplied order and marks the current account", () => {
    render(<Harness currentAccountId="many" />);

    const dialog = screen.getByRole("dialog", { name: "排行榜" });
    const items = within(dialog).getAllByRole("article");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("高分");
    expect(items[1]).toHaveTextContent("同分多胜");
    expect(items[1]).toHaveTextContent("Lv.3 · 猜中 2 次");
    expect(items[1]).toHaveTextContent("5 分");
    expect(items[1]).toHaveClass("current");
    expect(screen.getByText("当前排名第 2 名")).toBeInTheDocument();
  });

  it("explains that guests do not participate and shows an empty state", () => {
    const { rerender } = render(<Harness currentAccountId="guest" />);
    expect(screen.getByText("游客暂不参与排名")).toBeInTheDocument();

    rerender(<Harness currentAccountId="guest" rankedAccounts={[]} />);
    expect(screen.getByText("暂无已注册玩家")).toBeInTheDocument();
    expect(screen.getByText(/注册账号并猜对数字后/)).toBeInTheDocument();
  });

  it("renders hostile-looking usernames as text", () => {
    const hostile = '<img src=x onerror="alert(1)">';
    render(<Harness currentAccountId="hostile" rankedAccounts={[
      { ...accounts[0], id: "hostile", username: hostile }
    ]} />);

    expect(screen.getByText(hostile)).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});
