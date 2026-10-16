import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import * as gamePageModule from "./GamePage";

class MemoryStorage {
  readonly values = new Map<string, string>();
  writeCount = 0;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writeCount += 1;
    this.values.set(key, value);
  }
}

function renderGame(secretNumbers: number[] = [42]) {
  expect(gamePageModule.GamePage).toBeTypeOf("function");
  const storage = new MemoryStorage();
  const createSecret = vi.fn(() => secretNumbers.shift() ?? 42);
  const createRecordId = vi.fn(() => "record-1");
  const view = render(
    <gamePageModule.GamePage
      storage={storage}
      createSecret={createSecret}
      createRecordId={createRecordId}
      now={() => new Date("2026-10-16T13:00:00.000Z")}
    />
  );
  return { ...view, storage, createSecret, createRecordId };
}

describe("GamePage", () => {
  it("starts with the complete range and nine available chances", () => {
    renderGame();
    expect(screen.getByRole("heading", { name: "数字侦探" })).toBeInTheDocument();
    expect(within(screen.getByLabelText("游戏进度")).getByText("1–100")).toBeInTheDocument();
    expect(screen.getByText("剩余机会").nextElementSibling).toHaveTextContent("9");
    expect(screen.getByRole("textbox", { name: "输入你的猜测" })).toBeEnabled();
  });

  it.each([
    ["", "请输入 1 到 100 之间的整数。"],
    ["1.5", "请输入 1 到 100 之间的整数。"],
    ["101", "数字需要落在 1 到 100 之间哦。"]
  ])("rejects invalid input %p", async (rawValue, expectedMessage) => {
    const user = userEvent.setup();
    renderGame();
    const input = screen.getByRole("textbox", { name: "输入你的猜测" });
    if (rawValue) fireEvent.change(input, { target: { value: rawValue } });
    await user.click(screen.getByRole("button", { name: "猜一猜" }));
    expect(screen.getByRole("alert")).toHaveTextContent(expectedMessage);
    expect(screen.getByText("已猜次数").nextElementSibling).toHaveTextContent("0");
  });

  it("submits with Enter, narrows both sides, and rejects duplicates", async () => {
    const user = userEvent.setup();
    renderGame();
    const input = screen.getByRole("textbox", { name: "输入你的猜测" });

    await user.type(input, "20{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("数字有点小");
    expect(screen.getByText("21–100")).toBeInTheDocument();

    await user.type(input, "20{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent("这个数字已经猜过啦");

    await user.clear(input);
    await user.type(input, "70{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("数字有点大");
    expect(screen.getByText("21–69")).toBeInTheDocument();
  });

  it("records a win exactly once and restarts with a fresh secret", async () => {
    const user = userEvent.setup();
    const { storage, createSecret, createRecordId } = renderGame([42, 77]);
    const input = screen.getByRole("textbox", { name: "输入你的猜测" });

    await user.type(input, "42{Enter}");
    expect(screen.getByRole("heading", { name: "恭喜你，猜对了！" })).toBeInTheDocument();
    expect(input).toBeDisabled();
    expect(createRecordId).toHaveBeenCalledTimes(1);
    expect(storage.writeCount).toBe(1);
    expect(JSON.parse(storage.values.get("number-detective.guest.v1") ?? "null")).toMatchObject({
      points: 1,
      records: [{ id: "record-1", result: "won", secretNumber: 42 }]
    });

    await user.click(screen.getByRole("button", { name: "再玩一局" }));
    expect(createSecret).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("textbox", { name: "输入你的猜测" })).toBeEnabled();
    expect(within(screen.getByLabelText("游戏进度")).getByText("1–100")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "恭喜你，猜对了！" })).not.toBeInTheDocument();
  });

  it("shows a loss and saves no point after the ninth incorrect guess", async () => {
    const user = userEvent.setup();
    const { storage } = renderGame([100]);
    const input = screen.getByRole("textbox", { name: "输入你的猜测" });

    for (const guess of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      await user.type(input, `${guess}{Enter}`);
    }

    expect(screen.getByRole("heading", { name: "差一点点" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("机会用完了");
    expect(input).toBeDisabled();
    expect(JSON.parse(storage.values.get("number-detective.guest.v1") ?? "null")).toMatchObject({
      points: 0,
      records: [{ result: "lost", attempts: 9, secretNumber: 100 }]
    });
  });
});
