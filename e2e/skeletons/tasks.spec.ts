import { test, expect } from '@playwright/test';

/**
 * TSK-* spec skeleton (§10).
 */

test.describe('TSK — tasks / my tasks', () => {
  test.skip(true, 'Skeleton — staging Supabase gerekli.');

  test('TSK-01 · gruplama Today/Upcoming/Next week/Later', async ({ page }) => {
    // TODO: due tarihleri kontrollü fixture → her grupta doğru task listelenir
    expect(true).toBe(true);
  });

  test('TSK-02 · Unassigned grubu — "Sahipsiz işler" başlığı', async ({ page }) => {
    // MyTasksView L124 (F16 fix) — assignee null 3 task oluştur,
    // "Sahipsiz işler" section'ında hepsi render olmalı, sayısı doğru.
    // NOT: PRD-#4 bilinen açığı bu fix ile kapatıldı; test doğrulama görevi.
    expect(true).toBe(true);
  });

  test('TSK-04 · quick add — enter ile ekle', async ({ page }) => {
    // TODO: QuickAddIssue input → enter → task oluştu, input temiz
    expect(true).toBe(true);
  });

  test('TSK-06 · yeniden atama → iki bildirim', async ({ page }) => {
    // TODO: A→B assignee: A "removed", B "assigned"
    expect(true).toBe(true);
  });

  test('TSK-08 · dairesel bağımlılık reddi', async ({ page }) => {
    // TODO: A blocks B, B blocks A → 400
    expect(true).toBe(true);
  });
});
