import { supabase } from "@/integrations/supabase/client";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

/**
 * Tek atımlık ajan çağrısı — SSE akışını okuyup parça parça geri verir.
 * AiChat sayfasındaki akışın yeniden kullanılabilir, minimal hali.
 */
export async function askAgent({
  message,
  domain,
  onDelta,
}: {
  message: string;
  domain: string;
  onDelta: (text: string) => void;
}): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Oturum bulunamadı");

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message, domain, history: [] }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: `Hata ${resp.status}` }));
    throw new Error(err.error ?? `Hata ${resp.status}`);
  }
  if (!resp.body) throw new Error("Yanıt gövdesi yok");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  let done = false;

  while (!done) {
    const { done: streamDone, value } = await reader.read();
    if (streamDone) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed.choices?.[0]?.delta?.content ?? "";
        if (delta) { full += delta; onDelta(full); }
      } catch { /* partial frame */ }
    }
  }

  return full;
}
