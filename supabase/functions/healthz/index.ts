import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve((_req) => {
  return new Response(
    JSON.stringify({ ok: true, ts: new Date().toISOString() }),
    { headers: { "Content-Type": "application/json" } },
  );
});
