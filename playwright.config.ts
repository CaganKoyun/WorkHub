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
  // macOS 12'de Playwright'ın kendi Chromium'u indirilemiyor (mac12-arm64
  // desteği yok); sistemdeki Google Chrome ile çalışıyoruz.
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
