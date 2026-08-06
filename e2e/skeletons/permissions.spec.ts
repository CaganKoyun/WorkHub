import { test, expect } from '@playwright/test';

/**
 * PERM-* spec skeleton (§4). Rol × modül × aksiyon matrisi.
 */

test.describe('PERM — role × module × action', () => {
  test.skip(true, 'Skeleton — 6 roles seed + staging DB gerekli.');

  test('PERM-01 · OW/AD proje CRUD; MG owned; VW read-only', async ({ browser }) => {
    // TODO: her rol için ayrı context, aksiyon matrisi loop
    expect(true).toBe(true);
  });

  test('PERM-04 · VW login → "New Project" butonu yok', async ({ page }) => {
    // TODO: viewer login, Projects sayfasında CTA butonu bulunmasın
    expect(true).toBe(true);
  });

  test('PERM-06 · tek OW rol düşürmez (min 1 owner)', async ({ page }) => {
    // TODO: /workspace/settings → kendi rolünü admin yap → reddedilir
    expect(true).toBe(true);
  });
});
