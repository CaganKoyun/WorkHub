import { Link } from "react-router-dom";
import { Rss, Calendar, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { StackedLogo } from "@/components/StackedLogo";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import type { ChangelogEntry } from "@/content/changelog/entries";

import entry20260801 from "@/content/changelog/2026-08-01";
import entry20260728 from "@/content/changelog/2026-07-28";
import entry20260715 from "@/content/changelog/2026-07-15";

const allEntries: ChangelogEntry[] = [
  entry20260801,
  entry20260728,
  entry20260715,
].sort((a, b) => b.date.localeCompare(a.date));

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const Changelog = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground">
              <StackedLogo size={13} color="currentColor" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">FounderOS</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <Link to="/changelog" className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-foreground transition-colors hover:text-foreground">
              Changelog
            </Link>
            <Link to="/security" className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              Security
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden rounded-md px-3 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-block">
              Log in
            </Link>
            <Link
              to="/auth"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13.5px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Get started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="border-b border-border bg-canvas px-6 py-16">
        <div className="mx-auto max-w-[800px]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[clamp(2rem,4.2vw,3rem)] font-semibold leading-tight tracking-[-0.03em]">
                Changelog
              </h1>
              <p className="mt-3 max-w-[520px] text-[16px] leading-relaxed text-muted-foreground">
                New features, improvements, and fixes shipped to FounderOS.
              </p>
            </div>
            <a
              href="/api/rss-changelog"
              className="mt-2 inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-input bg-background px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Rss className="h-3.5 w-3.5" />
              RSS
            </a>
          </div>
        </div>
      </section>

      {/* Entries */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-[800px] space-y-8">
          {allEntries.map((entry) => (
            <Card key={entry.date}>
              <CardHeader>
                <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                </div>
                <h2 className="mt-1 text-[20px] font-semibold leading-tight tracking-[-0.02em]">
                  {entry.title}
                </h2>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-muted-foreground prose-headings:text-foreground prose-headings:text-[15px] prose-headings:font-semibold prose-headings:tracking-normal prose-p:text-[14px] prose-p:leading-relaxed prose-li:text-[14px] prose-li:leading-relaxed prose-strong:text-foreground prose-code:rounded prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[13px] prose-code:font-mono prose-code:before:content-none prose-code:after:content-none">
                  <ReactMarkdown>{entry.content}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground">
              <StackedLogo size={13} color="currentColor" />
            </span>
            <span className="text-[14px] font-semibold tracking-tight">FounderOS</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
            <Link to="/" className="transition-colors hover:text-foreground">Product</Link>
            <Link to="/changelog" className="transition-colors hover:text-foreground">Changelog</Link>
            <Link to="/security" className="transition-colors hover:text-foreground">Security</Link>
          </div>
          <span className="text-[12.5px] text-muted-foreground">&copy; {new Date().getFullYear()} FounderOS</span>
        </div>
      </footer>
    </div>
  );
};

export default Changelog;
