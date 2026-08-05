/**
 * Web Speech API wrapper — Chrome/Edge/Safari desteği var; Firefox yok.
 * Tarayıcı-özel window.webkitSpeechRecognition + standart SpeechRecognition.
 * Hiçbir bağımlılık yok, saf browser API.
 */

// Web Speech tipleri lib.dom.d.ts'de opsiyonel; kendi minimal declaration'ımız.
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: {
      length: number;
      isFinal: boolean;
      [j: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionErrorLike { error?: string; message?: string }

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionCtor { new(): SpeechRecognitionLike }

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechSupported(): boolean {
  return getCtor() !== null;
}

export interface SpeechSession {
  stop(): void;
  abort(): void;
}

export interface SpeechOptions {
  lang?: string;           // default 'tr-TR'
  continuous?: boolean;    // default true
  interimResults?: boolean;// default true
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (msg: string) => void;
  onEnd?: () => void;
  onStart?: () => void;
}

/** Start dictation. Caller stops via returned handle or lets it end naturally. */
export function startSpeech(opts: SpeechOptions): SpeechSession | null {
  const Ctor = getCtor();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = opts.lang ?? 'tr-TR';
  rec.continuous = opts.continuous ?? true;
  rec.interimResults = opts.interimResults ?? true;
  rec.maxAlternatives = 1;

  let interim = '';
  rec.onresult = (event) => {
    interim = '';
    let finalText = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i];
      const t = r[0]?.transcript ?? '';
      if (r.isFinal) finalText += t;
      else interim += t;
    }
    if (finalText) opts.onFinal?.(finalText.trim());
    if (interim) opts.onInterim?.(interim.trim());
  };
  rec.onerror = (e) => {
    opts.onError?.(e.error ?? e.message ?? 'unknown');
  };
  rec.onend = () => opts.onEnd?.();
  rec.onstart = () => opts.onStart?.();

  try {
    rec.start();
  } catch (err) {
    opts.onError?.((err as { message?: string }).message ?? 'start failed');
    return null;
  }

  return {
    stop: () => { try { rec.stop(); } catch { /* noop */ } },
    abort: () => { try { rec.abort(); } catch { /* noop */ } },
  };
}
