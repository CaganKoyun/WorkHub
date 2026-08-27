/**
 * Pure client-side heuristic extraction for meeting transcripts.
 * No LLM dependency — trigger patterns hit ~80% of what a founder actually
 * asks the note-taker to capture (owner-verb-object). LLM upgrade can slot in
 * as an Edge Function later; the return shape stays.
 */

export interface ExtractedActionItem {
  id: string;
  text: string;
  assignee_email?: string;
  done: boolean;
  task_id?: string | null;
}

export interface ExtractionResult {
  summary: string;
  action_items: ExtractedActionItem[];
}

// TODO/action-line markers — case-insensitive; Turkish + English.
const LINE_MARKERS = /^\s*(?:[-*•]\s*)?(?:action(?:\s*item)?|todo|task|görev|aksiyon|yapılacak|ödev)\s*[:\-–]\s*/i;

// Sentence-embedded action verbs (someone will do X / X yapacak / X'i biri ilgilenecek).
const SENTENCE_MARKERS: RegExp[] = [
  /\bwill\s+(?:do|send|write|schedule|prepare|follow up|share|contact|call|email|create|update|review|ship|fix|test|design|implement|draft|circulate)\b[^.!?\n]*/gi,
  /\b(?:should|needs? to|must|has to)\s+(?:do|send|write|schedule|prepare|follow up|share|contact|call|email|create|update|review|ship|fix|test|design|implement|draft|circulate)\b[^.!?\n]*/gi,
  /\b(?:yapacak|hazırlayacak|gönderecek|paylaşacak|planlayacak|ilgilenecek|bakacak|yazacak|arayacak|iletecek|kontrol edecek|halledecek|çıkaracak|tamamlayacak)\b[^.!?\n]*/gi,
];

const EMAIL_RE = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

function findEmail(text: string): string | undefined {
  const m = text.match(EMAIL_RE);
  return m ? m[0] : undefined;
}

/** Split into first N meaningful sentences for a summary. */
function summarize(transcript: string, sentences = 3): string {
  const cleaned = transcript.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const parts = cleaned.split(/(?<=[.!?…])\s+(?=[A-ZÇĞİÖŞÜ])/u);
  const picked = parts.slice(0, sentences).join(' ');
  return picked.length > 500 ? picked.slice(0, 497) + '…' : picked;
}

function cleanItem(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[.!?…]+$/, '')
    .trim();
}

export function extractMeetingNotes(transcript: string): ExtractionResult {
  const summary = summarize(transcript);
  const found = new Map<string, ExtractedActionItem>();

  // Line-marked items win outright.
  for (const raw of transcript.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (LINE_MARKERS.test(line)) {
      const text = cleanItem(line.replace(LINE_MARKERS, ''));
      if (text.length >= 3) {
        const key = text.toLowerCase();
        if (!found.has(key)) {
          found.set(key, {
            id: crypto.randomUUID(),
            text,
            assignee_email: findEmail(text),
            done: false,
          });
        }
      }
    }
  }

  // Sentence-embedded matches — capped so we don't dump every "we will…"
  const bodyLower = transcript;
  for (const re of SENTENCE_MARKERS) {
    let m: RegExpExecArray | null;
    // Reset lastIndex to keep the global regex idempotent per call.
    re.lastIndex = 0;
    while ((m = re.exec(bodyLower)) !== null && found.size < 25) {
      const text = cleanItem(m[0]);
      if (text.length < 6) continue;
      const key = text.toLowerCase();
      if (found.has(key)) continue;
      found.set(key, {
        id: crypto.randomUUID(),
        text,
        assignee_email: findEmail(text),
        done: false,
      });
    }
  }

  return { summary, action_items: [...found.values()] };
}
