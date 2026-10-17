import { describe, expect, it, vi } from "vitest";

import { createInitialLocalProfile } from "./local-profile";
import {
  hashLocalPassword,
  loginLocalAccount,
  logoutLocalAccount,
  registerLocalAccount
} from "./local-auth";

const dependencies = {
  createAccountId: () => "user-alice",
  hashPassword: vi.fn(async (password: string) => `hashed:${password}`)
};

describe("local account authentication", () => {
  it("registers a normalized account and signs in immediately", async () => {
    const result = await registerLocalAccount(
      createInitialLocalProfile(),
      { username: "  Alice  ", password: "pass", confirmation: "pass" },
      dependencies
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.currentAccountId).toBe("user-alice");
    expect(result.state.accounts["user-alice"]).toEqual({
      id: "user-alice",
      username: "Alice",
      isGuest: false,
      passwordHash: "hashed:pass",
      points: 0,
      records: []
    });
  });

  it.each([
    [
      { username: "A", password: "pass", confirmation: "pass" },
      "用户名需要 2–16 个字符。"
    ],
    [
      { username: "Alice", password: "123", confirmation: "123" },
      "密码需要 4–32 个字符。"
    ],
    [
      { username: "Alice", password: "pass", confirmation: "nope" },
      "两次输入的密码不一致。"
    ]
  ])("rejects invalid registration fields", async (input, error) => {
    await expect(registerLocalAccount(createInitialLocalProfile(), input, dependencies))
      .resolves.toEqual({ ok: false, error });
  });

  it("rejects a duplicate username after trimming and case folding", async () => {
    const first = await registerLocalAccount(
      createInitialLocalProfile(),
      { username: "Alice", password: "pass", confirmation: "pass" },
      dependencies
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    await expect(registerLocalAccount(
      first.state,
      { username: "  ALICE ", password: "next", confirmation: "next" },
      { ...dependencies, createAccountId: () => "user-second" }
    )).resolves.toEqual({ ok: false, error: "这个用户名已经注册过了。" });
  });

  it("logs in case-insensitively, rejects bad credentials, and logs out to guest", async () => {
    const registered = await registerLocalAccount(
      createInitialLocalProfile(),
      { username: "Alice", password: "pass", confirmation: "pass" },
      dependencies
    );
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;

    const signedOut = logoutLocalAccount(registered.state);
    expect(signedOut.currentAccountId).toBe("guest");

    await expect(loginLocalAccount(
      signedOut,
      { username: " alice ", password: "bad1" },
      dependencies
    )).resolves.toEqual({ ok: false, error: "用户名或密码不正确。" });

    const signedIn = await loginLocalAccount(
      signedOut,
      { username: " alice ", password: "pass" },
      dependencies
    );
    expect(signedIn.ok).toBe(true);
    if (signedIn.ok) expect(signedIn.state.currentAccountId).toBe("user-alice");
  });
});

describe("hashLocalPassword", () => {
  it("uses a deterministic non-plaintext fallback when Web Crypto is unavailable", async () => {
    const first = await hashLocalPassword("secret", null);
    const second = await hashLocalPassword("secret", null);

    expect(first).toBe(second);
    expect(first).toMatch(/^local_[0-9a-f]+$/);
    expect(first).not.toContain("secret");
  });
});
