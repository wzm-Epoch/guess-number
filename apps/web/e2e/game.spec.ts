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
  await page.getByRole("button", { name: "森林" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "forest");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "forest");
  await expect(page.getByRole("button", { name: "森林" })).toHaveAttribute("aria-pressed", "true");
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

test.describe("mobile layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps the guess form visible without horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("textbox", { name: "输入你的猜测" })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
  });
});
