import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  // Expose env vars from three prefixes so the same code works whether the
  // deploy uses our own VITE_* keys or the ones Vercel's Supabase integration
  // auto-provisions (workhub_* / NEXT_PUBLIC_workhub_*).
  envPrefix: ["VITE_", "NEXT_PUBLIC_", "workhub_"],
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
    sourcemap: mode === "production" ? "hidden" : true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          ui: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-tabs",
            "@radix-ui/react-select",
            "@radix-ui/react-tooltip",
          ],
          query: ["@tanstack/react-query"],
          editor: ["@tiptap/react", "@tiptap/starter-kit"],
          dates: ["date-fns"],
        },
      },
    },
  },
}));
