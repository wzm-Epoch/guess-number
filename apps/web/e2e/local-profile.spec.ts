import { expect, test } from "@playwright/test";

async function register(page: import("@playwright/test").Page, username: string) {
  await page.getByRole("button", { name: "登录" }).click();
  const dialog = page.getByRole("dialog", { name: "登录或注册" });
  await dialog.getByRole("tab", { name: "注册" }).click();
  await dialog.getByLabel("用户名").fill(username);
  await dialog.getByLabel("密码", { exact: true }).fill("pass1234");
  await dialog.getByLabel("确认密码").fill("pass1234");
  await dialog.getByRole("button", { name: "注册并登录" }).click();
  await expect(dialog).toBeHidden();
}

async function logout(page: import("@playwright/test").Page, username: string) {
  await page.getByRole("button", { name: username }).click();
  await page.getByRole("dialog", { name: "登录或注册" }).getByRole("button", { name: "退出登录" }).click();
  await expect(page.getByRole("button", { name: "登录" })).toBeVisible();
}

test("restores a local account while keeping another account isolated", async ({ page }) => {
  await page.goto("/");
  await register(page, "Alice");

  const input = page.getByRole("textbox", { name: "输入你的猜测" });
  await input.fill("42");
  await input.press("Enter");
  await expect(page.getByRole("heading", { name: "恭喜你，猜对了！" })).toBeVisible();
  await expect(page.getByText("本局 +1 积分 · 升级至 Lv.2")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Alice" })).toBeVisible();
  await expect(page.getByLabel("当前账号、积分与等级")).toContainText("1 积分");
  await expect(page.getByLabel("当前等级")).toContainText("2");

  await page.getByRole("button", { name: "排行" }).click();
  const ranking = page.getByRole("dialog", { name: "排行榜" });
  await expect(ranking.getByRole("article")).toContainText("Alice");
  await expect(ranking.getByRole("article")).toContainText("1 分");
  await ranking.getByRole("button", { name: "关闭" }).click();

  await page.getByRole("button", { name: "战绩" }).click();
  const history = page.getByRole("dialog", { name: "历史记录" });
  await expect(history.getByText("第 1 次猜中")).toBeVisible();
  await history.getByRole("button", { name: "关闭" }).click();

  await logout(page, "Alice");
  await register(page, "Bob");
  await expect(page.getByLabel("当前账号、积分与等级")).toContainText("0 积分");
  await page.getByRole("button", { name: "战绩" }).click();
  await expect(page.getByRole("dialog", { name: "历史记录" }).getByText(/还没有历史记录/)).toBeVisible();
  await page.getByRole("dialog", { name: "历史记录" }).getByRole("button", { name: "关闭" }).click();

  await logout(page, "Bob");
  await page.getByRole("button", { name: "登录" }).click();
  const login = page.getByRole("dialog", { name: "登录或注册" });
  await login.getByLabel("用户名").fill("alice");
  await login.getByLabel("密码", { exact: true }).fill("pass1234");
  await login.getByLabel("密码", { exact: true }).press("Enter");
  await expect(login).toBeHidden();
  await expect(page.getByRole("button", { name: "Alice" })).toBeVisible();
  await expect(page.getByLabel("当前账号、积分与等级")).toContainText("1 积分");
});
