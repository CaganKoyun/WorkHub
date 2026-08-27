import { describe, it, expect, beforeEach } from 'vitest';
import { translate, loadLang, saveLang } from './i18n';

beforeEach(() => { localStorage.clear(); });

describe('i18n translate', () => {
  it('returns TR string for a known key', () => {
    expect(translate('tr', 'nav.issues')).toBe("Issue'lar");
  });
  it('returns EN string for a known key', () => {
    expect(translate('en', 'nav.issues')).toBe('Issues');
  });
  it('falls back to the key when missing', () => {
    expect(translate('tr', 'not.a.key.foo')).toBe('not.a.key.foo');
    expect(translate('en', 'not.a.key.foo')).toBe('not.a.key.foo');
  });
});

describe('i18n storage', () => {
  it('loadLang returns a valid lang by default', () => {
    // Falls back to navigator.language, then 'tr'; both are valid tokens.
    expect(['tr', 'en']).toContain(loadLang());
  });
  it('loadLang returns the stored value', () => {
    saveLang('en');
    expect(loadLang()).toBe('en');
    saveLang('tr');
    expect(loadLang()).toBe('tr');
  });
  it('ignores garbage in storage', () => {
    localStorage.setItem('wh:lang', 'xx');
    // Garbage means "no valid stored value" — fall back to a valid default.
    expect(['tr', 'en']).toContain(loadLang());
  });
});
