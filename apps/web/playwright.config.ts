import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const windowsChrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const executablePath = process.platform === "win32" && existsSync(windowsChrome)
  ? windowsChrome
  : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: executablePath ? { executablePath } : undefined
      }
    }
  ],
  webServer: {
    command: "npm run dev -- --mode test --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
