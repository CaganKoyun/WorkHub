/**
 * Global keyboard shortcuts for WorkHub.
 *
 * Simple registry + a single window keydown listener installer. Handles:
 *  - modifier combos (⌘/Ctrl + K)
 *  - simple keys (?, C)
 *  - chord sequences (G then H)
 *
 * Ignores events inside form fields / contenteditable, so nothing hijacks
 * typing in inputs or the rich text editor.
 */

export interface ShortcutDef {
  id: string;
  category: 'Navigasyon' | 'Aksiyon' | 'Yardım';
  /** Human-readable combo, e.g. "⌘K", "?", "G H". */
  keys: string;
  label: string;
  action: () => void;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

interface Handler {
  match: (e: KeyboardEvent, chord: string[]) => boolean;
  run: () => void;
}

interface ShortcutsBundle {
  shortcuts: ShortcutDef[];
  install(): () => void;
}

/**
 * Build the shortcuts bundle for a navigator + a set of callbacks
 * ("open command palette", "new issue"). App composes these once at mount.
 */
export function buildShortcuts(opts: {
  navigate: (path: string) => void;
  openPalette: () => void;
  openHelp: () => void;
  newIssue: () => void;
}): ShortcutsBundle {
  const { navigate, openPalette, openHelp, newIssue } = opts;

  const shortcuts: ShortcutDef[] = [
    // Aksiyon
    { id: 'palette',  category: 'Aksiyon', keys: '⌘K',  label: 'Komut paletini aç',        action: openPalette },
    { id: 'new_iss',  category: 'Aksiyon', keys: 'C',   label: 'Yeni issue',                action: newIssue },
    { id: 'help',     category: 'Yardım',  keys: '?',   label: 'Klavye kısayolları',        action: openHelp },
    // Navigasyon chord'ları — "G" + tuş
    { id: 'go_home',  category: 'Navigasyon', keys: 'G H', label: 'Founder Home',           action: () => navigate('/home') },
    { id: 'go_inbox', category: 'Navigasyon', keys: 'G I', label: 'Inbox',                  action: () => navigate('/inbox') },
    { id: 'go_iss',   category: 'Navigasyon', keys: 'G T', label: 'Issues',                 action: () => navigate('/issues') },
    { id: 'go_mine',  category: 'Navigasyon', keys: 'G M', label: 'My Tasks',               action: () => navigate('/tasks') },
    { id: 'go_proj',  category: 'Navigasyon', keys: 'G P', label: 'Projeler',               action: () => navigate('/projects') },
    { id: 'go_cyc',   category: 'Navigasyon', keys: 'G C', label: 'Cycles',                 action: () => navigate('/cycles') },
    { id: 'go_docs',  category: 'Navigasyon', keys: 'G D', label: 'Docs',                   action: () => navigate('/docs') },
    { id: 'go_chat',  category: 'Navigasyon', keys: 'G S', label: 'Chat',                   action: () => navigate('/chat') },
    { id: 'go_ai',    category: 'Navigasyon', keys: 'G A', label: 'Chief of Staff',         action: () => navigate('/ai-chat') },
    { id: 'go_lead',  category: 'Navigasyon', keys: 'G L', label: 'Skor tablosu',           action: () => navigate('/leaderboard') },
    { id: 'go_desk',  category: 'Navigasyon', keys: 'G K', label: 'Service Desk',           action: () => navigate('/desk') },
  ];

  const handlers: Handler[] = shortcuts.map(s => ({
    match: (e, chord) => matchesCombo(e, chord, s.keys),
    run: s.action,
  }));

  return {
    shortcuts,
    install() {
      let chord: string[] = [];
      let chordTimer: number | null = null;

      const armChord = () => {
        if (chordTimer) window.clearTimeout(chordTimer);
        chordTimer = window.setTimeout(() => { chord = []; }, 1200);
      };

      const onKey = (e: KeyboardEvent) => {
        // Always allow "?" and "⌘K" even in inputs — they trigger overlays.
        const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
        const isQuestion = e.key === '?' && !(e.metaKey || e.ctrlKey);
        if (!isCmdK && !isQuestion && isTypingTarget(e.target)) return;

        for (const h of handlers) {
          if (h.match(e, chord)) {
            e.preventDefault();
            chord = [];
            if (chordTimer) window.clearTimeout(chordTimer);
            h.run();
            return;
          }
        }

        // Track chord starter "G" (case-insensitive, no modifiers).
        if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'g' && chord.length === 0) {
          chord = ['g'];
          armChord();
        }
      };

      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    },
  };
}

/** Match a KeyboardEvent (+ current chord) against a display combo string. */
export function matchesCombo(e: KeyboardEvent, chord: string[], combo: string): boolean {
  const c = combo.toLowerCase();
  const key = e.key.toLowerCase();

  // Chord "G X"
  const chordMatch = c.match(/^g\s+([a-z])$/);
  if (chordMatch) {
    return chord[0] === 'g' && key === chordMatch[1];
  }

  // ⌘K
  if (c === '⌘k') return (e.metaKey || e.ctrlKey) && key === 'k';
  if (c === '?') return key === '?' && !e.metaKey && !e.ctrlKey;

  // Simple single-key (letter) — no modifiers.
  if (/^[a-z]$/.test(c)) return !e.metaKey && !e.ctrlKey && !e.altKey && key === c;

  return false;
}
