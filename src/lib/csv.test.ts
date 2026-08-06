import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  guessTaskField,
  normalizeStatus,
  normalizePriority,
  parseTags,
  normalizeDate,
} from './csv';

/**
 * IMP-01/02/03 · Import — CSV parse + field guessing.
 * Backend-bağımsız, saf fonksiyon testleri.
 */

describe('parseCsv', () => {
  it('parses a simple header + rows CSV', () => {
    const r = parseCsv('name,age\nAlice,30\nBob,25');
    expect(r.headers).toEqual(['name', 'age']);
    expect(r.rows).toEqual([
      ['Alice', '30'],
      ['Bob', '25'],
    ]);
  });

  it('trims header whitespace', () => {
    const r = parseCsv('  a  , b\n1,2');
    expect(r.headers).toEqual(['a', 'b']);
  });

  it('handles quoted fields with embedded commas', () => {
    const r = parseCsv('title,notes\n"Foo, bar",baz');
    expect(r.rows[0]).toEqual(['Foo, bar', 'baz']);
  });

  it('escapes doubled quotes inside quoted fields', () => {
    const r = parseCsv('a\n"He said ""hi"""');
    expect(r.rows[0]).toEqual(['He said "hi"']);
  });

  it('handles CRLF line endings', () => {
    const r = parseCsv('a,b\r\n1,2\r\n3,4');
    expect(r.rows).toEqual([
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('handles mixed empty and non-empty rows', () => {
    const r = parseCsv('a\n1\n\n2\n');
    expect(r.rows).toEqual([['1'], [''], ['2']]);
  });

  it('strips only fully-empty trailing rows', () => {
    const r = parseCsv('a\n1\n\n\n');
    expect(r.rows[r.rows.length - 1]).toEqual(['1']);
  });

  it('preserves fields containing only whitespace', () => {
    const r = parseCsv('a,b\n  ,x');
    expect(r.rows[0]).toEqual(['  ', 'x']);
  });

  it('returns empty headers array on empty input', () => {
    const r = parseCsv('');
    expect(r.headers).toEqual([]);
    expect(r.rows).toEqual([]);
  });
});

describe('guessTaskField', () => {
  it.each([
    ['Title', 'title'],
    ['Task Name', 'title'],
    ['issue', 'title'],
    ['Summary', 'title'],
    ['Description', 'description'],
    ['Notes', 'description'],
    ['Status', 'status'],
    ['Stage', 'status'],
    ['Priority', 'priority'],
    ['importance', 'priority'],
    ['Assignee', 'assignee'],
    ['Assigned To', 'assignee'],
    ['owner', 'assignee'],
    ['Due Date', 'due_date'],
    ['Deadline', 'due_date'],
    ['Tags', 'tags'],
    ['Labels', 'tags'],
    ['ID', 'external_id'],
    ['Key', 'external_id'],
    ['Ticket', 'external_id'],
    ['Story Points', 'story_points'],
    ['Estimate', 'story_points'],
    ['Estimated Hours', 'estimated_hours'],
    ['Effort', 'estimated_hours'],
  ])('%s → %s', (header, expected) => {
    expect(guessTaskField(header)).toBe(expected);
  });

  it('returns null for unknown headers', () => {
    expect(guessTaskField('some_random_column')).toBeNull();
  });

  it('is whitespace/case/separator insensitive', () => {
    expect(guessTaskField('  Due-date ')).toBe('due_date');
    expect(guessTaskField('DUE_DATE')).toBe('due_date');
    expect(guessTaskField('due date')).toBe('due_date');
  });
});

describe('normalizeStatus', () => {
  it.each([
    ['to do', 'todo'],
    ['To-Do', 'todo'],
    ['open', 'todo'],
    ['New', 'todo'],
    ['In Progress', 'in_progress'],
    ['doing', 'in_progress'],
    ['WIP', 'in_progress'],
    ['In Review', 'review'],
    ['QA', 'review'],
    ['Done', 'done'],
    ['closed', 'done'],
    ['resolved', 'done'],
    ['Canceled', 'canceled'],
    ['cancelled', 'canceled'],
    ['duplicate', 'canceled'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizeStatus(raw)).toBe(expected);
  });

  it('returns null for unknown status', () => {
    expect(normalizeStatus('unicorn')).toBeNull();
  });
});

describe('normalizePriority', () => {
  it.each([
    ['Urgent', 'urgent'],
    ['P0', 'urgent'],
    ['critical', 'urgent'],
    ['High', 'high'],
    ['important', 'high'],
    ['medium', 'medium'],
    ['normal', 'medium'],
    ['none', 'medium'],
    ['no priority', 'medium'],
    ['Low', 'low'],
    ['minor', 'low'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizePriority(raw)).toBe(expected);
  });

  it('returns null for unknown priority', () => {
    expect(normalizePriority('galaxy-brain')).toBeNull();
  });
});

describe('parseTags', () => {
  it('splits comma-separated tags and trims', () => {
    expect(parseTags('a, b ,c')).toEqual(['a', 'b', 'c']);
  });

  it('accepts semicolon and pipe as separators', () => {
    expect(parseTags('a;b|c')).toEqual(['a', 'b', 'c']);
  });

  it('drops empty entries', () => {
    expect(parseTags('a,,b,')).toEqual(['a', 'b']);
  });

  it('empty input → empty array', () => {
    expect(parseTags('')).toEqual([]);
  });
});

describe('normalizeDate', () => {
  it('passes ISO YYYY-MM-DD through', () => {
    expect(normalizeDate('2026-08-06')).toBe('2026-08-06');
  });

  it('trims ISO datetime to YYYY-MM-DD', () => {
    expect(normalizeDate('2026-08-06T13:00:00Z')).toBe('2026-08-06');
  });

  it('parses DD/MM/YYYY (last-4 heuristic)', () => {
    expect(normalizeDate('06/08/2026')).toBe('2026-08-06');
  });

  it('parses YYYY/MM/DD (first-4 heuristic)', () => {
    expect(normalizeDate('2026/08/06')).toBe('2026-08-06');
  });

  it('parses dotted separator', () => {
    expect(normalizeDate('06.08.2026')).toBe('2026-08-06');
  });

  it('falls back to Date parse for RFC strings', () => {
    expect(normalizeDate('Aug 6 2026')).toBe('2026-08-06');
  });

  it('returns null for gibberish', () => {
    expect(normalizeDate('not a date at all')).toBeNull();
  });

  it('empty string → null', () => {
    expect(normalizeDate('')).toBeNull();
  });
});
