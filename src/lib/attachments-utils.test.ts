import { describe, it, expect } from 'vitest';
import { formatBytes } from './attachments-utils';

/**
 * PRJ-16 · Files/attachments byte formatlaması. Sınır değerler + null-safe.
 */

describe('formatBytes', () => {
  it.each<[number | null | undefined, string]>([
    [null, '0 B'],
    [undefined, '0 B'],
    [0, '0 B'],
    [-1, '0 B'],
    [500, '500 B'],
    [1023, '1023 B'],
    [1024, '1.0 KB'],
    [1536, '1.5 KB'],
    [1024 * 1024, '1.0 MB'],
    [1024 * 1024 * 5, '5.0 MB'],
    [1024 * 1024 * 10, '10 MB'],
    [1024 * 1024 * 1024, '1.0 GB'],
    [1024 * 1024 * 1024 * 2048, '2048 GB'],
  ])('%s → %s', (input, expected) => {
    expect(formatBytes(input)).toBe(expected);
  });

  it('does not go below 1 decimal in KB..GB range under 10', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  it('drops decimals once value ≥ 10 in the unit', () => {
    expect(formatBytes(1024 * 20)).toBe('20 KB');
  });
});
