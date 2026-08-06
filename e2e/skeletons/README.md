# E2E Spec İskeletleri

Bu klasör, `docs/TEST_COVERAGE_DETAILED.md` içindeki P0/P1 senaryoların
Playwright'a önceden aktarılmış **iskeletleridir**. Şu anda hepsi
`test.skip` ile devre dışı — ama:

- Selector'ları, prompt sözleşmesini ve assertion şablonunu şimdiden içerir.
- Kapsam dokümanındaki ID (AUTH-01, PRJ-10, …) her bloğun başlığında.
- Live Supabase (email confirmation off + gevşetilmiş rate-limit) hazır
  olduğunda `test.skip` → aktif teste dönüştürmek 1 satır iş.

## Etkinleştirme

Bir dosyayı canlı hale getirmek için:

1. `test.describe('...', () => { test.skip(...) })` satırlarındaki
   `test.skip` çağrısını kaldır veya koşul ekle.
2. Fixture'a ihtiyacı olan senaryolarda `src/test/fixtures/` altındaki
   factory'leri çağır.
3. CI'da `E2E_MODE=live` env'i set edilirse iskelet otomatik açılmasını
   sağlamak için ileride bir helper eklenebilir.

## Kural

- Bir spec dosyası **tek bir modül** kapsamlıdır (Projects, Bugs, CRM…).
- Her `test('AUTH-01 …')` bloğu tek davranış test eder.
- Selector'lar `getByRole` → `getByPlaceholder` → `getByTestId` sırasında
  denenir. `data-testid` eklenmesi gereken yerlerde yorum bırakılır.
- Test uzun sürerse (`> 30s`) trace ve screenshot artifact'e yüklenir.
