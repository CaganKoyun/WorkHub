import { test, expect } from '@playwright/test';

/**
 * PRJ-* spec skeleton (docs/TEST_COVERAGE_DETAILED.md §9).
 */

test.describe('PRJ — projects', () => {
  test.skip(true, 'Skeleton — staging Supabase gerekli.');

  test('PRJ-01 · yeni proje minimum alan', async ({ page }) => {
    await page.goto('/projects/new');
    // TODO: ad gir → Create → /projects/:id redirect
    expect(true).toBe(true);
  });

  test('PRJ-03 · ad sınırları (uzun / emoji / XSS)', async ({ page }) => {
    // TODO: 200 char ok, 201 char reddet, `<img onerror=alert(1)>` escape edildi
    expect(true).toBe(true);
  });

  test('PRJ-04 · şablondan proje — default task/doc kopyalandı', async ({ page }) => {
    // TODO: Software launch template → 3 task + 2 doc oluştu
    expect(true).toBe(true);
  });

  test('PRJ-07 · proje silme cascade + onay dialog', async ({ page }) => {
    // TODO: 10 task içeren proje → sil → onay dialog → task/file/message temizlendi
    expect(true).toBe(true);
  });

  test('PRJ-10 · board drag & drop — status update + activity_log', async ({ page }) => {
    // TODO: task'ı Todo → In Progress; refresh sonrası sıra korunmuş
    expect(true).toBe(true);
  });

  test('PRJ-11 · board DnD hata → rollback', async ({ page }) => {
    // TODO: network 500 mock → task eski konumuna dönmeli, toast görünmeli
    expect(true).toBe(true);
  });

  test('PRJ-16 · files upload — 5MB ok, 51MB reddet', async ({ page }) => {
    // TODO: file input ile upload; boyut sınırı kontrolü
    expect(true).toBe(true);
  });

  test('PRJ-20 · members ekleme → member my tasks görebilir', async ({ page }) => {
    // TODO: OW member ekle → member login → /tasks içinde proje visible
    expect(true).toBe(true);
  });
});
