import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const entries = [
  {
    date: "2026-08-01",
    title: "Decision System of Record v2",
    description: "Verdict tracking, confidence calibration, company snapshot freeze, pre-mortem dialog, and assumption ledger.",
  },
  {
    date: "2026-07-28",
    title: "Multi-tenancy & Finance Module",
    description: "Workspace isolation with RLS hardening, finance module with cash position, burn rate, runway projection.",
  },
  {
    date: "2026-07-15",
    title: "CRM Pipeline & Founder Inbox",
    description: "Full CRM pipeline board, opportunity-to-customer flow, approval workflow with delegation and snooze.",
  },
];

serve((_req) => {
  const items = entries
    .map(
      (e) => `    <item>
      <title>${escapeXml(e.title)}</title>
      <description>${escapeXml(e.description)}</description>
      <pubDate>${new Date(e.date).toUTCString()}</pubDate>
      <link>https://founderos.app/changelog</link>
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>FounderOS Changelog</title>
    <link>https://founderos.app/changelog</link>
    <description>Product updates from FounderOS</description>
    <language>en</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
});

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
