import { Link } from "react-router-dom";
import { ArrowRight, Check, X } from "lucide-react";
import { StackedLogo } from "@/components/StackedLogo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CompareData } from "@/content/compare/notion";

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return <Check className="h-4 w-4 text-success" />;
  }
  if (value === false) {
    return <X className="h-4 w-4 text-muted-foreground/50" />;
  }
  return (
    <span className="text-[12.5px] leading-tight text-muted-foreground">
      {value}
    </span>
  );
}

export default function CompareTemplate({ data }: { data: CompareData }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav — matches Landing.tsx */}
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground">
              <StackedLogo size={13} color="currentColor" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              FounderOS
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <Link
              to="/"
              className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Product
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="hidden rounded-md px-3 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
            >
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

      {/* Hero */}
      <section className="border-b border-border bg-canvas px-6 py-20">
        <div className="mx-auto max-w-[860px] text-center">
          <Badge variant="secondary" className="mb-6">
            Comparison
          </Badge>
          <h1 className="text-[clamp(2rem,4.8vw,3.5rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
            FounderOS vs {data.competitor}
          </h1>
          <p className="mx-auto mt-5 max-w-[640px] text-[16px] leading-relaxed text-muted-foreground">
            {data.tagline}
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link to="/auth">
                Start free — no card
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Arguments */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[800px]">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-primary">
            Why switch
          </span>
          <h2 className="mt-3 text-[clamp(1.6rem,3vw,2.2rem)] font-semibold leading-tight tracking-[-0.03em]">
            Reasons to move to FounderOS
          </h2>
          <ol className="mt-10 space-y-8">
            {data.arguments.map((arg, i) => (
              <li key={i} className="flex gap-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-[13px] font-semibold text-foreground">
                  {i + 1}
                </span>
                <p className="pt-1 text-[15px] leading-relaxed text-muted-foreground">
                  {arg}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="border-y border-border bg-canvas px-6 py-20">
        <div className="mx-auto max-w-[860px]">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-primary">
            Feature by feature
          </span>
          <h2 className="mt-3 text-[clamp(1.6rem,3vw,2.2rem)] font-semibold leading-tight tracking-[-0.03em]">
            Side-by-side comparison
          </h2>

          <Card className="mt-10 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="px-5 py-3.5 text-[13px] font-semibold">
                        Feature
                      </th>
                      <th className="px-5 py-3.5 text-center text-[13px] font-semibold">
                        FounderOS
                      </th>
                      <th className="px-5 py-3.5 text-center text-[13px] font-semibold">
                        {data.competitor}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.features.map((f, i) => (
                      <tr
                        key={f.name}
                        className={
                          i < data.features.length - 1
                            ? "border-b border-border"
                            : ""
                        }
                      >
                        <td className="px-5 py-3 text-[13.5px]">{f.name}</td>
                        <td className="px-5 py-3 text-center">
                          <span className="inline-flex justify-center">
                            <FeatureCell value={f.founderos} />
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="inline-flex justify-center">
                            <FeatureCell value={f.competitor} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[1120px] rounded-2xl bg-sidebar px-8 py-14 text-center">
          <h2 className="mx-auto max-w-[640px] text-[clamp(1.7rem,3.2vw,2.4rem)] font-semibold leading-tight tracking-[-0.03em] text-sidebar-accent-foreground">
            {data.ctaText}
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[15px] text-sidebar-foreground">
            Start free — no credit card required. Set up in two minutes.
          </p>
          <div className="mt-7">
            <Button asChild size="lg">
              <Link to="/auth">
                Get started
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer — matches Landing.tsx */}
      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground">
              <StackedLogo size={13} color="currentColor" />
            </span>
            <span className="text-[14px] font-semibold tracking-tight">
              FounderOS
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
            <Link
              to="/"
              className="transition-colors hover:text-foreground"
            >
              Product
            </Link>
          </div>
          <span className="text-[12.5px] text-muted-foreground">
            &copy; {new Date().getFullYear()} FounderOS
          </span>
        </div>
      </footer>
    </div>
  );
}
