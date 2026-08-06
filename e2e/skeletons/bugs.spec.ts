import { test, expect } from '@playwright/test';

/**
 * BUG-* spec skeleton (§11).
 */

test.describe('BUG — bugs', () => {
  test.skip(true, 'Skeleton — staging Supabase gerekli.');

  test('BUG-01 · BUG-##### sıra atlamıyor (race koşulunda)', async ({ browser }) => {
    // TODO: paralel 3 create → 00001..00003, no gap
    expect(true).toBe(true);
  });

  test('BUG-04 · status akışı — open→in-progress→resolved→closed→reopened', async ({ page }) => {
    // TODO: her geçişi butonla tetikle; tersleri disable/hidden
    expect(true).toBe(true);
  });

  test('BUG-05 · attachment private bucket — direct URL 403', async ({ request }) => {
    // TODO: upload → signed URL çalışır, ham storage URL 403
    expect(true).toBe(true);
  });

  test('BUG-06 · MIME allowlist — png ok, exe reddedilir', async ({ page }) => {
    // TODO: iki file input denemesi
    expect(true).toBe(true);
  });

  test('BUG-07 · 10MB limit', async ({ page }) => {
    // TODO: 9MB ok, 11MB reddet
    expect(true).toBe(true);
  });
});
