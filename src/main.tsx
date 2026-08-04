import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ---------------------------------------------------------------------------
// Startup diagnostic. Before importing App (which chains into the Supabase
// client), verify the required env is present. Without this a missing
// VITE_SUPABASE_URL causes createClient(undefined, undefined) → TypeError at
// module load → blank page with no clue why.
// ---------------------------------------------------------------------------
const requiredEnv = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const;
const missing = requiredEnv.filter((k) => !(import.meta.env as Record<string, string | undefined>)[k]);
const root = document.getElementById("root")!;

if (missing.length > 0) {
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0F0F13;color:#F4F5F8;font:14px/1.5 Inter,system-ui,sans-serif;padding:24px">
      <div style="max-width:520px">
        <div style="display:inline-flex;align-items:center;gap:8px;padding:4px 10px;border:1px solid #5E6AD2;border-radius:999px;background:rgba(94,106,210,.12);color:#8B95E8;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase">Startup blocked</div>
        <h1 style="margin:16px 0 8px;font-size:22px;font-weight:600;letter-spacing:-.02em">Missing environment variables</h1>
        <p style="margin:0 0 16px;color:#8A8F98">
          WorkHub can't connect to Supabase because these variables aren't set
          in this environment:
        </p>
        <ul style="margin:0 0 20px;padding:0;list-style:none;font-family:'Geist Mono',ui-monospace,monospace;font-size:12.5px">
          ${missing.map((k) => `<li style="padding:6px 10px;border:1px solid #262933;border-radius:6px;background:#151820;margin-bottom:6px">${k}</li>`).join("")}
        </ul>
        <p style="margin:0;color:#8A8F98;font-size:12.5px">
          On Vercel: <em>Project → Settings → Environment Variables</em>, add
          each key for the <strong>Production</strong> and <strong>Preview</strong>
          scopes, then redeploy the latest commit.
        </p>
      </div>
    </div>
  `;
} else {
  createRoot(root).render(<App />);
}
