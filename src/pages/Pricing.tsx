import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, X, Minus, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { StackedLogo } from "@/components/StackedLogo";
import { PLANS, FEATURE_COMPARISON, type Plan, type PlanFeature } from "@/lib/plans";

/* ---------- helpers ---------- */

function formatPrice(plan: Plan, yearly: boolean) {
  const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
  if (price === null) return null;
  if (price === 0) return "$0";
  return `$${price}`;
}

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-primary" />;
  if (value === false) return <X className="mx-auto h-4 w-4 text-muted-foreground/40" />;
  return <span className="text-[13px] text-foreground">{value}</span>;
}

/* ---------- FAQ ---------- */

const FAQ_ITEMS = [
  {
    q: "Is there really a free plan?",
    a: "Yes. The Free plan is free forever with up to 3 team members and 1 workspace. No credit card required to get started.",
  },
  {
    q: "How does the 14-day free trial work?",
    a: "When you sign up for Team or Growth you get full access for 14 days. If you decide not to continue, your workspace drops back to Free-tier limits -- no data is deleted.",
  },
  {
    q: "Can I change plans later?",
    a: "You can upgrade or downgrade at any time. When you upgrade, you are charged a prorated amount for the remainder of the billing cycle. When you downgrade, the new rate applies at the next renewal.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards. Annual plans can also be paid by invoice and wire transfer for Team and above.",
  },
  {
    q: "What happens to my data if I downgrade?",
    a: "Your data is never deleted. If your usage exceeds the lower plan's limits (contacts, storage, team members), those items become read-only until you reduce usage or upgrade again.",
  },
  {
    q: "Do you offer discounts for startups or nonprofits?",
    a: "Yes. We offer 50% off the first year for companies that are part of a recognized accelerator program or registered nonprofits. Contact us for details.",
  },
  {
    q: "Is my data secure?",
    a: "All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Growth and Scale plans include audit logs. Scale adds data residency options and a custom SLA.",
  },
  {
    q: "Can I import data from other tools?",
    a: "Growth and Scale plans include the Import Wizard, which supports CSV and direct integrations with common project management, CRM and finance tools. Free and Team users can import via CSV.",
  },
  {
    q: "What does Chief of Staff AI do?",
    a: "Chief of Staff AI is a domain-expert agent available on Growth and Scale plans. It can draft decisions, surface risks, summarize project status and answer questions grounded in your workspace data.",
  },
  {
    q: "How do I get support?",
    a: "Free plan users have access to community forums. Team gets priority email support. Growth includes Slack and email support with a 4-hour SLA. Scale gets a dedicated account manager.",
  },
];

/* ---------- component ---------- */

export default function Pricing() {
  const [yearly, setYearly] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Pricing - FounderOS";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav — same pattern as Landing.tsx */}
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground">
              <StackedLogo size={13} color="currentColor" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">FounderOS</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <Link
              to="/"
              className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Product
            </Link>
            <span className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-foreground">
              Pricing
            </span>
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
      <section className="px-6 pt-16 pb-4">
        <div className="mx-auto max-w-[900px] text-center">
          <h1 className="text-[clamp(2rem,4.6vw,3.4rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-4 max-w-[540px] text-[16px] leading-relaxed text-muted-foreground">
            Start free, upgrade when you need to. Every plan includes the full
            workspace -- you only pay for scale and AI.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span
              className={`text-[13.5px] font-medium ${!yearly ? "text-foreground" : "text-muted-foreground"}`}
            >
              Monthly
            </span>
            <Switch checked={yearly} onCheckedChange={setYearly} />
            <span
              className={`text-[13.5px] font-medium ${yearly ? "text-foreground" : "text-muted-foreground"}`}
            >
              Yearly
            </span>
            {yearly && (
              <Badge variant="secondary" className="ml-1 text-[11px] font-medium">
                Save up to 20%
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="px-6 py-10">
        <div className="mx-auto grid max-w-[1180px] gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const price = formatPrice(plan, yearly);
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${
                  plan.highlighted
                    ? "border-primary shadow-md ring-1 ring-primary"
                    : ""
                }`}
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[11px]">
                    Most Popular
                  </Badge>
                )}

                <CardHeader className="pb-4">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {plan.name}
                  </p>

                  <div className="mt-3 flex items-baseline gap-1">
                    {price !== null ? (
                      <>
                        <span className="text-[clamp(2rem,3.6vw,2.75rem)] font-semibold tracking-tight">
                          {price}
                        </span>
                        {plan.monthlyPrice !== 0 && (
                          <span className="text-[14px] text-muted-foreground">
                            / user / mo
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[clamp(1.6rem,3vw,2.2rem)] font-semibold tracking-tight">
                        Custom
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    {plan.description}
                  </p>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-[13.5px]"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    asChild
                    variant={plan.highlighted ? "default" : "outline"}
                    className="w-full"
                  >
                    <Link to={plan.ctaHref}>
                      {plan.cta}
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-[1180px]">
          <h2 className="text-center text-[clamp(1.5rem,2.8vw,2.1rem)] font-semibold tracking-[-0.03em]">
            Compare plans in detail
          </h2>
          <p className="mx-auto mt-3 max-w-[500px] text-center text-[14.5px] text-muted-foreground">
            Every plan includes the full workspace. Higher tiers unlock more
            capacity, AI and enterprise controls.
          </p>

          <div className="mt-10 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-5 py-3.5 text-[13px] font-semibold">
                    Feature
                  </th>
                  {PLANS.map((p) => (
                    <th
                      key={p.id}
                      className={`px-5 py-3.5 text-center text-[13px] font-semibold ${
                        p.highlighted ? "text-primary" : ""
                      }`}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_COMPARISON.map((row, i) => (
                  <tr
                    key={row.name}
                    className={`border-b border-border last:border-0 ${
                      i % 2 === 0 ? "bg-background" : "bg-secondary/20"
                    }`}
                  >
                    <td className="px-5 py-3 text-[13.5px] font-medium">
                      {row.name}
                    </td>
                    {(["free", "team", "growth", "scale"] as const).map(
                      (key) => (
                        <td key={key} className="px-5 py-3 text-center">
                          <FeatureCell value={row[key]} />
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-canvas px-6 py-16">
        <div className="mx-auto max-w-[760px]">
          <h2 className="text-center text-[clamp(1.5rem,2.8vw,2.1rem)] font-semibold tracking-[-0.03em]">
            Frequently asked questions
          </h2>

          <div className="mt-10 divide-y divide-border rounded-xl border border-border bg-background">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i}>
                <button
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-[14.5px] font-medium transition-colors hover:bg-secondary/40"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {item.q}
                  <Minus
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      openFaq === i ? "rotate-0" : "rotate-90"
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-[14px] leading-relaxed text-muted-foreground">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[1120px] rounded-2xl bg-sidebar px-8 py-14 text-center">
          <h2 className="mx-auto max-w-[620px] text-[clamp(1.7rem,3.2vw,2.4rem)] font-semibold leading-tight tracking-[-0.03em] text-sidebar-accent-foreground">
            Start free -- no credit card required
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[15px] text-sidebar-foreground">
            Set up your workspace in two minutes. Upgrade when your team is
            ready.
          </p>
          <Link
            to="/auth"
            className="mt-7 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-[14.5px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer — same pattern as Landing.tsx */}
      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground">
              <StackedLogo size={13} color="currentColor" />
            </span>
            <span className="text-[14px] font-semibold tracking-tight">FounderOS</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
            <Link to="/" className="transition-colors hover:text-foreground">
              Product
            </Link>
            <span className="text-foreground">Pricing</span>
          </div>
          <span className="text-[12.5px] text-muted-foreground">
            &copy; {new Date().getFullYear()} FounderOS
          </span>
        </div>
      </footer>
    </div>
  );
}
