import { test, expect } from '@playwright/test';

/**
 * CRM-* spec skeleton (§34).
 */

test.describe('CRM — pipeline / won-flow', () => {
  test.skip(true, 'Skeleton — staging Supabase gerekli.');

  test('CRM-03 · pipeline board drag — stage değişimi', async ({ page }) => {
    // TODO: opportunity kartını Won kolonuna sürükle
    expect(true).toBe(true);
  });

  test('CRM-05 · quote hesap — qty×unit − discount + KDV', async ({ page }) => {
    // TODO: qty=3, unit=100, disc 10%, KDV 20% → total 324
    expect(true).toBe(true);
  });

  test('CRM-07 · won-deal otomasyonu — customer + Inbox approval', async ({ page }) => {
    // TODO: Won → crm_customers satırı + /inbox'ta pending approval
    expect(true).toBe(true);
  });

  test('CRM-08 · won race — çift trigger tek customer', async ({ browser }) => {
    // TODO: iki context aynı anda Won → yalnız 1 customer + 1 approval
    expect(true).toBe(true);
  });
});
