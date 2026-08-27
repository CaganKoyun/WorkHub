import { test, expect } from "@playwright/test";

// Konsoldaki gerçek hataları yakala (React render hataları, kırık importlar).
// Supabase 401/403 ağ hataları oturumsuz gezintide beklenir, onları eleme.
function collectPageErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test("landing açılıyor", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/WorkHub/i).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("auth sayfası login formunu gösteriyor", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("oturumsuz kullanıcı korunan route'tan /auth'a düşer", async ({ page }) => {
  await page.goto("/home");
  await page.waitForURL("**/auth**", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
});

test("bilinmeyen route 404 gösteriyor", async ({ page }) => {
  await page.goto("/boyle-bir-sayfa-yok");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
});

test("/company protected route oturumsuz kullanıcıyı /auth'a yönlendirir", async ({ page }) => {
  await page.goto("/company");
  await page.waitForURL("**/auth**", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
});
