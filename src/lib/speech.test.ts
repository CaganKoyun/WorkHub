import { describe, it, expect } from 'vitest';
import { isSpeechSupported, startSpeech } from './speech';

describe('speech', () => {
  it('reports unsupported in jsdom (no SpeechRecognition ctor)', () => {
    // jsdom bunu implement etmez — fallback path'in doğru dallandığını doğrular.
    expect(isSpeechSupported()).toBe(false);
  });

  it('startSpeech returns null when unsupported', () => {
    const session = startSpeech({ onError: () => undefined });
    expect(session).toBeNull();
  });
});
