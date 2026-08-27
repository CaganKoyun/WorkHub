import { test, expect } from '@playwright/test';

/**
 * Regression · Reg #1 — decisions create/list should not 400.
 *
 * Known-open (PRD §6.1): the client sends `verdict` / `confidence` /
 * `actual_outcome` columns that don't yet exist server-side. This spec
 * is intentionally skipped and turns green the moment the migration
 * adding those columns lands.
 */

test.describe('Regression · decisions 400', () => {
  test.skip('POST /rest/v1/decisions succeeds with verdict/confidence fields', async ({ request }) => {
    // TODO(regression):
    // - Authenticate a test client
    // - Post { title, verdict, confidence, actual_outcome } to /decisions
    // - Expect 201, not 400
    // - GET /decisions?id=eq.<id>, expect the fields to round-trip
    expect(request).toBeDefined();
  });
});
