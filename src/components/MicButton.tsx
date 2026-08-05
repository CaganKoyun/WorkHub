import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { isSpeechSupported, startSpeech, type SpeechSession } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  /** Final text arrived from user — caller appends to their input. */
  onFinal: (text: string) => void;
  /** Live interim text — caller can preview under the input. Optional. */
  onInterim?: (text: string) => void;
  className?: string;
  lang?: string;
  size?: 'sm' | 'md';
  title?: string;
}

/**
 * Küçük mikrofon butonu — basınca dictation başlar/durur. Tarayıcı
 * desteği yoksa disable görünür ve tıklanınca kısa toast atar.
 */
export function MicButton({ onFinal, onInterim, className, lang, size = 'md', title }: Props) {
  const [recording, setRecording] = useState(false);
  const sessionRef = useRef<SpeechSession | null>(null);
  const supported = isSpeechSupported();

  useEffect(() => () => sessionRef.current?.abort(), []);

  const start = () => {
    if (!supported) {
      toast.error('Tarayıcı sesli girdi desteklemiyor');
      return;
    }
    const s = startSpeech({
      lang,
      onFinal: (t) => onFinal(t),
      onInterim: (t) => onInterim?.(t),
      onStart: () => setRecording(true),
      onEnd: () => { setRecording(false); sessionRef.current = null; },
      onError: (msg) => {
        setRecording(false);
        sessionRef.current = null;
        if (msg === 'not-allowed' || msg === 'service-not-allowed') {
          toast.error('Mikrofon izni verilmedi');
        } else if (msg !== 'aborted' && msg !== 'no-speech') {
          toast.error(`Ses tanıma hatası: ${msg}`);
        }
      },
    });
    sessionRef.current = s;
  };

  const stop = () => sessionRef.current?.stop();

  const dims = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <button
      type="button"
      onClick={recording ? stop : start}
      disabled={!supported}
      title={supported ? (title ?? (recording ? 'Kaydı durdur' : 'Sesli yaz (TR)')) : 'Tarayıcı desteklemiyor'}
      className={cn(
        'grid place-items-center rounded transition-colors',
        dims,
        recording
          ? 'bg-destructive/15 text-destructive animate-pulse'
          : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40',
        !supported && 'opacity-40 cursor-not-allowed',
        className,
      )}
    >
      {recording
        ? <Loader2 className={cn(iconSize, 'animate-spin')} />
        : supported
          ? <Mic className={iconSize} />
          : <MicOff className={iconSize} />}
    </button>
  );
}
