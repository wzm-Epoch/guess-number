import { expect, test } from "@playwright/test";

test("wins deterministically and keeps the saved history after reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "输入你的猜测" }).fill("42");
  await page.getByRole("textbox", { name: "输入你的猜测" }).press("Enter");
  await expect(page.getByRole("heading", { name: "恭喜你，猜对了！" })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "战绩" }).click();
  await expect(page.getByRole("dialog", { name: "历史记录" })).toBeVisible();
  await expect(page.getByText("第 1 次猜中")).toBeVisible();
  await expect(page.getByText("答案 42 · 共猜 1 次")).toBeVisible();
});

test("restores the selected theme after reload", async ({ page }) => {
  await page.goto("/");
  const background = page.getByRole("button", { name: "背景" });
  await expect(background).toHaveAttribute("aria-expanded", "false");
  await background.click();
  await page.getByRole("button", { name: "森林" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "forest");
  await page.keyboard.press("Escape");
  await expect(background).toHaveAttribute("aria-expanded", "false");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "forest");
  await page.getByRole("button", { name: "背景" }).click();
  await expect(page.getByRole("button", { name: "森林" })).toHaveAttribute("aria-pressed", "true");
});

test("restarts cleanly after a result", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "输入你的猜测" });
  await input.fill("42");
  await input.press("Enter");
  await page.getByRole("button", { name: "再玩一局" }).click();
  await expect(input).toBeEnabled();
  await expect(page.getByLabel("游戏进度")).toContainText("1–100");
  await expect(page.getByRole("heading", { name: "恭喜你，猜对了！" })).toBeHidden();
});

test("supports keyboard-only guess submission", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "输入你的猜测" });
  await input.focus();
  await page.keyboard.type("20");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("数字有点小");
  await expect(page.getByLabel("游戏进度")).toContainText("21–100");
});

test("honors reduced-motion preferences", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const regularDuration = await page.locator("body").evaluate(
    (element) => Number.parseFloat(getComputedStyle(element).transitionDuration) || 0
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedDuration = await page.locator("body").evaluate((element) => {
    const value = getComputedStyle(element).transitionDuration;
    return value.endsWith("ms") ? Number.parseFloat(value) / 1000 : Number.parseFloat(value);
  });
  expect(regularDuration).toBeGreaterThan(0.1);
  expect(reducedDuration).toBeLessThanOrEqual(0.00001);
});

for (const viewport of [{ width: 320, height: 700 }, { width: 390, height: 844 }]) {
  test.describe(`mobile layout ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test("keeps the guess form visible without horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("textbox", { name: "输入你的猜测" })).toBeVisible();
    await expect(page.getByLabel("游戏操作").getByRole("button")).toHaveText(["登录", "排行", "战绩", "重开"]);
    await expect(page.getByRole("button", { name: "联机" })).toHaveCount(0);
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      inputTop: document.querySelector<HTMLInputElement>("#guess-input")?.getBoundingClientRect().top ?? -1,
      inputBottom: document.querySelector<HTMLInputElement>("#guess-input")?.getBoundingClientRect().bottom ?? -1,
      innerHeight: window.innerHeight
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
    expect(dimensions.inputTop).toBeGreaterThanOrEqual(0);
    expect(dimensions.inputBottom).toBeLessThanOrEqual(dimensions.innerHeight);
    });
  });
}
