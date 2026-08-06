import { test, expect } from '@playwright/test';

/**
 * FIN-* spec skeleton (§35).
 */

test.describe('FIN — cash / burn / runway', () => {
  test.skip(true, 'Skeleton — staging Supabase gerekli.');

  test('FIN-01 · nakit bakiye — çok para birimli toplam', async ({ page }) => {
    // TODO: 3 hesap USD/TRY/EUR → fin_cash_balance TRY karşılığı
    expect(true).toBe(true);
  });

  test('FIN-02 · burn rate — 3 aylık ortalama', async ({ page }) => {
    // TODO: 3 ay outflow fixture → doğru ortalama
    expect(true).toBe(true);
  });

  test('FIN-03 · runway = cash / burn, burn 0 → ∞', async ({ page }) => {
    expect(true).toBe(true);
  });

  test('FIN-04 · FX eksik oran — açık hata', async ({ page }) => {
    // TODO: fx_rates boş → UI "FX oranı eksik"
    expect(true).toBe(true);
  });

  test('FIN-13 · kapatılmış dönem — insert reddi', async ({ page }) => {
    // TODO: Ocak kapalı → Ocak tarihli işlem reddedilir
    expect(true).toBe(true);
  });
});
