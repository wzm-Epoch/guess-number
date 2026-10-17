import { useState, type FormEvent, type RefObject } from "react";

import type { AuthResult, LoginInput, RegisterInput } from "../profile/local-auth";
import type { LocalAccount } from "../profile/local-profile";
import type { LevelInfo } from "../profile/progression";
import { Dialog } from "./Dialog";

interface AccountDialogProps {
  open: boolean;
  account: LocalAccount;
  levelInfo: LevelInfo;
  onLogin: (input: LoginInput) => Promise<AuthResult>;
  onRegister: (input: RegisterInput) => Promise<AuthResult>;
  onLogout: () => void;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}

type AuthMode = "login" | "register";

export function AccountDialog({
  open,
  account,
  levelInfo,
  onLogin,
  onRegister,
  onLogout,
  onClose,
  returnFocusRef
}: AccountDialogProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function selectMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmation("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const result = mode === "login"
        ? await onLogin({ username, password })
        : await onRegister({ username, password, confirmation });
      if (result.ok) {
        setPassword("");
        setConfirmation("");
      } else {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} title="登录或注册" onClose={onClose} returnFocusRef={returnFocusRef}>
      {account.isGuest ? (
        <div className="auth-form-wrap">
          <div className="auth-tabs" role="tablist" aria-label="账号操作">
            <button
              className={mode === "login" ? "auth-tab active" : "auth-tab"}
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => selectMode("login")}
            >
              登录
            </button>
            <button
              className={mode === "register" ? "auth-tab active" : "auth-tab"}
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              onClick={() => selectMode("register")}
            >
              注册
            </button>
          </div>
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <label className="auth-field">
              用户名
              <input
                name="username"
                type="text"
                maxLength={16}
                autoComplete="username"
                placeholder="2–16 个字符"
                value={username}
                disabled={submitting}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label className="auth-field">
              密码
              <input
                name="password"
                type="password"
                maxLength={32}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="至少 4 个字符"
                value={password}
                disabled={submitting}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {mode === "register" ? (
              <label className="auth-field">
                确认密码
                <input
                  name="confirmation"
                  type="password"
                  maxLength={32}
                  autoComplete="new-password"
                  placeholder="再次输入密码"
                  value={confirmation}
                  disabled={submitting}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </label>
            ) : null}
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? `${mode === "login" ? "登录" : "注册"}中…` : mode === "login" ? "登录" : "注册并登录"}
            </button>
          </form>
        </div>
      ) : (
        <div className="account-panel">
          <div className="account-avatar" aria-hidden="true">{account.username.slice(0, 1)}</div>
          <h3>{account.username}</h3>
          <p>Lv.{levelInfo.level} · {account.points} 积分 · {account.records.length} 局记录</p>
          <button className="secondary-button" type="button" onClick={onLogout}>退出登录</button>
        </div>
      )}
      <p className="auth-note">账号、积分和历史记录仅保存在当前浏览器中，请勿复用重要密码。</p>
    </Dialog>
  );
}
