import { test, expect } from '@playwright/test';

/**
 * WS/SEC · Multi-tenant RLS (§3, §50).
 * Backend'e doğrudan supabase-js istekleri kritik — helper eklenmeli:
 *   createTestClient(role, workspaceId) → supabase client
 */

test.describe('WS — cross-workspace RLS isolation', () => {
  test.skip(true, 'Skeleton — createTestClient helper + staging DB gerekli.');

  test('WS-01 · workspace switch veri sızıntısı yok', async ({ page }) => {
    // TODO: W1'de proje P1 aç, W2'ye geç → Projects listesinde P1 yok
    expect(true).toBe(true);
  });

  test('WS-02 · task read çapraz — 0 satır', async ({ request }) => {
    // TODO: user B doğrudan REST ile wA_row_id → 0 satır
    expect(true).toBe(true);
  });

  test('WS-03 · update çapraz — 403', async ({ request }) => {
    // TODO: user B wA task update → 403
    expect(true).toBe(true);
  });

  test('SEC-01 · anonim client — public read hariç 0 satır', async ({ request }) => {
    // TODO: anon key ile tüm tablolar üstünde select * loop
    expect(true).toBe(true);
  });

  test('SEC-02 · SQL injection — search input', async ({ page }) => {
    // TODO: `'; drop table users; --` → 0 sonuç, DB sağlam
    expect(true).toBe(true);
  });

  test('SEC-04 · CSRF — cross-origin POST 403', async ({ request }) => {
    // TODO: farklı Origin header ile POST
    expect(true).toBe(true);
  });
});
