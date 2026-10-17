import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { createInitialLocalProfile, type LocalAccount } from "../profile/local-profile";
import type { AuthResult } from "../profile/local-auth";
import type { LevelInfo } from "../profile/progression";
import { AccountDialog } from "./AccountDialog";

const guest = createInitialLocalProfile().accounts.guest;
const levelInfo: LevelInfo = { level: 1, progress: 0, pointsToNext: 1, nextLevel: 2 };

function Harness({
  account = guest,
  onLogin = vi.fn(async (): Promise<AuthResult> => ({ ok: false, error: "登录失败" })),
  onRegister = vi.fn(async (): Promise<AuthResult> => ({ ok: false, error: "注册失败" })),
  onLogout = vi.fn()
}: {
  account?: LocalAccount;
  onLogin?: (input: { username: string; password: string }) => Promise<AuthResult>;
  onRegister?: (input: { username: string; password: string; confirmation: string }) => Promise<AuthResult>;
  onLogout?: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={triggerRef} type="button">账号</button>
      <AccountDialog
        open
        account={account}
        levelInfo={levelInfo}
        onLogin={onLogin}
        onRegister={onRegister}
        onLogout={onLogout}
        onClose={vi.fn()}
        returnFocusRef={triggerRef}
      />
    </>
  );
}

describe("AccountDialog", () => {
  it("switches to registration and submits normalized field values", async () => {
    const user = userEvent.setup();
    const onRegister = vi.fn(async (): Promise<AuthResult> => ({ ok: false, error: "演示错误" }));
    render(<Harness onRegister={onRegister} />);

    expect(screen.getByRole("dialog", { name: "登录或注册" })).toBeInTheDocument();
    expect(screen.getByText(/仅保存在当前浏览器/)).toBeInTheDocument();
    expect(screen.getByText(/请勿复用重要密码/)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "注册" }));
    await user.type(screen.getByLabelText("用户名"), "Alice");
    await user.type(screen.getByLabelText("密码"), "pass");
    await user.type(screen.getByLabelText("确认密码"), "pass");
    await user.click(screen.getByRole("button", { name: "注册并登录" }));

    expect(onRegister).toHaveBeenCalledWith({
      username: "Alice",
      password: "pass",
      confirmation: "pass"
    });
    expect(screen.getByRole("alert")).toHaveTextContent("演示错误");
    expect(screen.getByLabelText("用户名")).toHaveValue("Alice");
  });

  it("submits login credentials and disables submission while pending", async () => {
    const user = userEvent.setup();
    let resolveLogin: ((result: AuthResult) => void) | undefined;
    const onLogin = vi.fn(() => new Promise<AuthResult>((resolve) => { resolveLogin = resolve; }));
    render(<Harness onLogin={onLogin} />);

    await user.type(screen.getByLabelText("用户名"), "Alice");
    await user.type(screen.getByLabelText("密码"), "pass");
    await user.click(screen.getByRole("button", { name: "登录" }));

    expect(onLogin).toHaveBeenCalledWith({ username: "Alice", password: "pass" });
    expect(screen.getByRole("button", { name: "登录中…" })).toBeDisabled();
    resolveLogin?.({ ok: false, error: "用户名或密码不正确。" });
    expect(await screen.findByRole("alert")).toHaveTextContent("用户名或密码不正确。");
  });

  it("shows the signed-in account and logs out without interpreting username HTML", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    const account: LocalAccount = {
      id: "user-1",
      username: '<img src=x onerror="alert(1)">',
      isGuest: false,
      passwordHash: "hash",
      points: 7,
      records: []
    };
    render(<Harness account={account} onLogout={onLogout} />);

    expect(screen.getByText(account.username)).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText("Lv.1 · 7 积分 · 0 局记录")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "退出登录" }));
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
