import { test, expect } from '@playwright/test';

/**
 * INB-* spec skeleton (§8) — approval loop.
 */

test.describe('INB — founder inbox / approvals', () => {
  test.skip(true, 'Skeleton — staging Supabase gerekli.');

  test('INB-02 · approve happy path', async ({ page }) => {
    // TODO: MG expense oluştur → OW approve → status: approved + bildirim
    expect(true).toBe(true);
  });

  test('INB-03 · reject — sebep zorunlu', async ({ page }) => {
    // TODO: reject modal, boş sebep reddet
    expect(true).toBe(true);
  });

  test('INB-05 · delegate — hedef inbox-una tasir', async ({ page }) => {
    expect(true).toBe(true);
  });

  test('INB-06 · snooze — süre sonu pendinge döner', async ({ page }) => {
    // TODO: clock mock ile 24h ileri sar
    expect(true).toBe(true);
  });

  test('INB-08 · çift onaycı race — 200 + 409', async ({ browser }) => {
    // TODO: iki context aynı anda approve
    expect(true).toBe(true);
  });
});
