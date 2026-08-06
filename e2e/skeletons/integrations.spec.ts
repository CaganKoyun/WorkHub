import { test, expect } from '@playwright/test';

/**
 * INT-* spec skeleton (§42) — OAuth 2.1 PKCE.
 */

test.describe('INT — integrations OAuth', () => {
  test.skip(true, 'Skeleton — mock OAuth provider + staging DB gerekli.');

  test('INT-03 · callback başarılı → token saklandı', async ({ page }) => {
    // TODO: /integrations → provider seç → mock IdP → callback → workspace_connections
    expect(true).toBe(true);
  });

  test('INT-04 · callback state mismatch → 400', async ({ page }) => {
    // TODO: state param'ı manipüle et → CSRF hatası
    expect(true).toBe(true);
  });

  test('INT-06 · token refresh', async ({ page }) => {
    // TODO: access expired → refresh token ile yeni access sakland
    expect(true).toBe(true);
  });
});
