import { describe, it, expect } from 'vitest';
import { formatBytes } from './attachments-utils';

describe('formatBytes', () => {
  it('handles empty', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(null)).toBe('0 B');
    expect(formatBytes(undefined)).toBe('0 B');
  });
  it('scales to KB / MB / GB', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
    expect(formatBytes(5 * 1024 * 1024 * 1024)).toBe('5.0 GB');
  });
  it('rounds when >=10', () => {
    expect(formatBytes(15 * 1024)).toBe('15 KB');
    expect(formatBytes(150 * 1024)).toBe('150 KB');
  });
});
