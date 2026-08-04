import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./integrations/supabase/client";

// ---------------------------------------------------------------------------
// Startup diagnostic. Verify the resolved Supabase config before mounting the
// React tree — otherwise createClient(undefined, undefined) throws at module
// load and the user sees a blank page with no clue why.
//
// The client picks env values from three prefixes (VITE_*, workhub_*,
// NEXT_PUBLIC_workhub_*) so the diagnostic mentions the whole set the app
// can accept.
// ---------------------------------------------------------------------------
const missing: string[] = [];
if (!SUPABASE_URL) missing.push("SUPABASE_URL");
if (!SUPABASE_PUBLISHABLE_KEY) missing.push("SUPABASE_PUBLISHABLE_KEY (or ANON_KEY)");

const root = document.getElementById("root")!;

if (missing.length > 0) {
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0F0F13;color:#F4F5F8;font:14px/1.5 Inter,system-ui,sans-serif;padding:24px">
      <div style="max-width:560px">
        <div style="display:inline-flex;align-items:center;gap:8px;padding:4px 10px;border:1px solid #5E6AD2;border-radius:999px;background:rgba(94,106,210,.12);color:#8B95E8;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase">Startup blocked</div>
        <h1 style="margin:16px 0 8px;font-size:22px;font-weight:600;letter-spacing:-.02em">Missing Supabase environment</h1>
        <p style="margin:0 0 16px;color:#8A8F98">
          WorkHub couldn't resolve a Supabase URL / key from the deploy
          environment. It looks for these keys, first hit wins:
        </p>
        <ul style="margin:0 0 20px;padding:0;list-style:none;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px">
          ${missing.map((m) => `<li style="padding:6px 10px;border:1px solid #262933;border-radius:6px;background:#151820;margin-bottom:6px">Missing → <strong>${m}</strong></li>`).join("")}
        </ul>
        <p style="margin:0 0 8px;color:#8A8F98;font-size:12.5px">Accepted names, in priority order:</p>
        <ul style="margin:0 0 16px;padding:0 0 0 18px;color:#8A8F98;font-family:'Geist Mono',ui-monospace,monospace;font-size:11.5px">
          <li>VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY</li>
          <li>NEXT_PUBLIC_workhub_SUPABASE_URL, NEXT_PUBLIC_workhub_SUPABASE_PUBLISHABLE_KEY</li>
          <li>workhub_SUPABASE_URL, workhub_SUPABASE_PUBLISHABLE_KEY</li>
          <li>NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
        </ul>
        <p style="margin:0;color:#8A8F98;font-size:12.5px">
          On Vercel: <em>Project → Settings → Environment Variables</em>. Add
          the values for <strong>Production</strong> and <strong>Preview</strong>,
          then redeploy the latest commit.
        </p>
      </div>
    </div>
  `;
} else {
  createRoot(root).render(<App />);
}
