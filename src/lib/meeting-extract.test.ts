import { describe, it, expect } from 'vitest';
import { extractMeetingNotes } from './meeting-extract';

describe('extractMeetingNotes', () => {
  it('returns empty on empty input', () => {
    const r = extractMeetingNotes('');
    expect(r.summary).toBe('');
    expect(r.action_items).toEqual([]);
  });

  it('captures TODO-prefixed lines', () => {
    const t = 'Notlar:\n- TODO: Ayşe mockup hazırlayacak\n- Not important line\n- Task: Ship v0.9';
    const r = extractMeetingNotes(t);
    const texts = r.action_items.map(a => a.text.toLowerCase());
    expect(texts.some(x => x.includes('mockup'))).toBe(true);
    expect(texts.some(x => x.includes('ship v0.9'))).toBe(true);
  });

  it('captures Turkish "yapacak" sentences', () => {
    const t = 'Toplantı özeti: Ali pazarlama planını hazırlayacak. Bu arada başka bir konu daha vardı.';
    const r = extractMeetingNotes(t);
    expect(r.action_items.length).toBeGreaterThan(0);
    expect(r.action_items[0].text.toLowerCase()).toContain('hazırlayacak');
  });

  it('detects assignee email in an item', () => {
    const t = 'TODO: Send the deck to cagan@example.com by Friday';
    const r = extractMeetingNotes(t);
    expect(r.action_items[0].assignee_email).toBe('cagan@example.com');
  });

  it('produces a short summary', () => {
    const t = 'First sentence here. Second one is longer than the first. Third one closes out the summary. Fourth should NOT appear.';
    const r = extractMeetingNotes(t);
    expect(r.summary).toContain('First sentence');
    expect(r.summary).toContain('Third one');
    expect(r.summary).not.toContain('Fourth');
  });

  it('deduplicates identical line-marker action items', () => {
    // Two identical TODO: lines produce one line-marked hit; sentence-marker
    // pass may add a shorter variant, so cap by unique lowercase text.
    const t = 'TODO: Ayşe ürün planını hazırlayacak\nTODO: Ayşe ürün planını hazırlayacak';
    const r = extractMeetingNotes(t);
    const unique = new Set(r.action_items.map(a => a.text.toLowerCase()));
    expect(unique.size).toBe(r.action_items.length);
  });
});
