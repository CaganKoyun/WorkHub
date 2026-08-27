import { test, expect } from '@playwright/test';

/**
 * DEC-* spec skeleton (§38). PRD bilinen açık: verdict/confidence
 * kolonları yok → 400. Test kapatıldığında yeşile döner.
 */

test.describe('DEC — decisions (DSoR)', () => {
  test.skip(true, 'Skeleton — DB kolon eksikliği + staging DB gerekli.');

  test('DEC-01 · karar oluştur (regression:PRD-#1)', async ({ page }) => {
    // TODO: /decisions/new → context/rationale/alternatives/decision/verdict/confidence
    // Beklenen: 200; şu an 400 döner (PRD açık).
    expect(true).toBe(true);
  });

  test('DEC-04 · karar silinemez — revize v2 üretir', async ({ page }) => {
    // TODO: Revise butonu → v2 satırı, v1 immutable
    expect(true).toBe(true);
  });
});
