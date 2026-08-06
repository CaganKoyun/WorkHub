import { test, expect } from '@playwright/test';

/**
 * AUTH-* spec skeleton (docs/TEST_COVERAGE_DETAILED.md §1).
 * Live Supabase gerekir — şimdilik tüm bloklar test.skip.
 */

test.describe('AUTH — sign-up / sign-in / reset', () => {
  test.skip(true, 'Skeleton — staging Supabase (rate-limit relaxed) gerekli.');

  test('AUTH-01 · sign-up başarılı akışı', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('tab', { name: 'Sign up' }).click();
    // TODO: fixtures'dan email üret, Create workspace butonuna tıkla,
    //       /onboarding redirect'i doğrula, profiles satırı üretildi mi kontrol et.
    expect(true).toBe(true);
  });

  test('AUTH-04 · duplicate sign-up 409 verir', async ({ page }) => {
    // TODO: seed edilmiş kullanıcının e-postasıyla tekrar sign-up
    expect(true).toBe(true);
  });

  test('AUTH-05 · sign-in yanlış parola 5 kez → 6da rate-limit', async ({ page }) => {
    // TODO: /auth üzerinden 5 yanlış parola, 6. istekte 429 bekle
    expect(true).toBe(true);
  });

  test('AUTH-06 · sign-in başarılı → /dashboard veya /onboarding', async ({ page }) => {
    // TODO: seed edilmiş kullanıcı ile sign-in
    expect(true).toBe(true);
  });

  test('AUTH-07 · şifre sıfırlama tam döngü', async ({ page }) => {
    // TODO: forgot → mail linki (Supabase Admin API'den okuma) → yeni parola
    expect(true).toBe(true);
  });

  test('AUTH-15 · Set-Cookie SameSite=Lax, HttpOnly, Secure', async ({ page, context }) => {
    // TODO: sign-in sonrası cookie flag'lerini oku, üçünü de assert et
    expect(true).toBe(true);
  });
});
