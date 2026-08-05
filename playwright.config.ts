import { defineConfig, devices } from "@playwright/test";

// E2E smoke katmanı: uygulama kabuğunun gerçekten açıldığını doğrular
// (routing, auth yönlendirmesi, ölü import/başlatma hataları). Supabase'e
// giriş YAPMAZ — canlı hesap gerektiren akışlar bilinçli olarak kapsam dışı.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
  },
  // macOS 12'de Google Chrome'a düşer; Linux/CI'da (PLAYWRIGHT_BROWSERS_PATH set)
  // Playwright'ın kendi Chromium'unu kullanır.
  projects: [{
    name: "chromium",
    use: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {
          ...devices["Desktop Chrome"],
          launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
        }
      : process.env.PLAYWRIGHT_BROWSERS_PATH
        ? { ...devices["Desktop Chrome"] }
        : { ...devices["Desktop Chrome"], channel: "chrome" },
  }],
  webServer: {
    // Force IPv4 host — some sandboxed environments block the default '::'.
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://localhost:8080",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
