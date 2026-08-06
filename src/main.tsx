import { createRoot } from "react-dom/client";
import "./index.css";
import { registerServiceWorker } from "./lib/pwa";

registerServiceWorker();

// ---------------------------------------------------------------------------
// Startup diagnostic. This MUST run before any module that touches Supabase
// is imported — the client calls createClient() at module load and would
// throw before the guard could execute. That's why App is dynamically
// imported below only when the required env is present.
//
// Accepted env keys, first hit wins per role:
//   VITE_SUPABASE_URL, NEXT_PUBLIC_workhub_SUPABASE_URL, workhub_SUPABASE_URL,
//     NEXT_PUBLIC_SUPABASE_URL
//   VITE_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_workhub_SUPABASE_PUBLISHABLE_KEY,
//     workhub_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_workhub_SUPABASE_ANON_KEY,
//     workhub_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY
// ---------------------------------------------------------------------------
function pickEnv(...keys: string[]): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  for (const k of keys) {
    const v = env[k];
    if (v && v.length > 0) return v;
  }
  return undefined;
}

const urlKeys = [
  "VITE_SUPABASE_URL",
  "NEXT_PUBLIC_workhub_SUPABASE_URL",
  "workhub_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
];
const keyKeys = [
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_workhub_SUPABASE_PUBLISHABLE_KEY",
  "workhub_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_workhub_SUPABASE_ANON_KEY",
  "workhub_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const url = pickEnv(...urlKeys);
const key = pickEnv(...keyKeys);
const root = document.getElementById("root")!;

if (!url || !key) {
  const seenKeys = Object.keys(import.meta.env)
    .filter((k) => /supabase|workhub|next_public/i.test(k))
    .sort();
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0F0F13;color:#F4F5F8;font:14px/1.5 Inter,system-ui,sans-serif;padding:24px">
      <div style="max-width:600px">
        <div style="display:inline-flex;align-items:center;gap:8px;padding:4px 10px;border:1px solid #C6F432;border-radius:999px;background:rgba(198,244,50,.12);color:#C6F432;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase">Startup blocked</div>
        <h1 style="margin:16px 0 8px;font-size:22px;font-weight:600;letter-spacing:-.02em">Missing Supabase environment</h1>
        <p style="margin:0 0 12px;color:#8A8F98">
          Spark WorkHub couldn't resolve a Supabase URL/key at build time.
        </p>
        <div style="margin:0 0 16px;padding:10px 12px;border:1px solid #262933;border-radius:6px;background:#151820;font-family:'Geist Mono',ui-monospace,monospace;font-size:11.5px;line-height:1.7">
          URL   → ${url ? "<span style=\"color:#22c55e\">OK</span>" : "<span style=\"color:#ef4444\">missing</span>"}<br/>
          KEY   → ${key ? "<span style=\"color:#22c55e\">OK</span>" : "<span style=\"color:#ef4444\">missing</span>"}
        </div>
        <p style="margin:0 0 8px;color:#8A8F98;font-size:12.5px">Env keys the build actually saw (Supabase/Vercel-shaped):</p>
        <ul style="margin:0 0 16px;padding:0;list-style:none;font-family:'Geist Mono',ui-monospace,monospace;font-size:11.5px">
          ${
            seenKeys.length === 0
              ? '<li style="padding:6px 10px;border:1px solid #262933;border-radius:6px;background:#151820;color:#ef4444">(none — Vite is exposing zero matching env vars)</li>'
              : seenKeys.map((k) => `<li style="padding:6px 10px;border:1px solid #262933;border-radius:6px;background:#151820;margin-bottom:4px">${k}</li>`).join("")
          }
        </ul>
        <p style="margin:0;color:#8A8F98;font-size:12.5px">
          Add a URL + publishable/anon key on Vercel (Project → Settings →
          Environment Variables) using any of the accepted names, then
          redeploy the latest commit.
        </p>
      </div>
    </div>
  `;
} else {
  // Lazy import so nothing that touches the Supabase client runs on the
  // missing-env code path.
  void import("./App").then(({ default: App }) => {
    createRoot(root).render(<App />);
  });
}
