import { Link } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, LayoutGrid, Users, Target, Sparkles,
  BarChart3, Workflow, Plus, Search, Circle, CheckSquare,
} from "lucide-react";
import { StackedLogo } from "@/components/StackedLogo";

const features = [
  { icon: LayoutGrid, title: "Work management", desc: "Projects, tasks and bugs across List, Board, Timeline and Calendar — connected through the Company Graph." },
  { icon: Target, title: "Goals & OKRs", desc: "Objectives and key results that roll up automatically from every task and project underneath them." },
  { icon: Users, title: "CRM & Revenue", desc: "Pipeline, quotes, contracts and customer health. Won deals feed straight into Finance and delivery projects." },
  { icon: BarChart3, title: "Finance", desc: "Cash, burn, runway and project P&L. Multi-currency, budget variance, live from your actual records." },
  { icon: Workflow, title: "Founder Inbox", desc: "One queue for every approval — hiring, spend, contracts. Decide with the full context attached." },
  { icon: Sparkles, title: "Chief of Staff AI", desc: "A domain-expert agent inside every module, grounded in your own workspace data." },
];

const modules = [
  "Projects", "Tasks", "Bugs", "Goals", "Risks", "Decisions",
  "CRM", "Finance", "Assets", "People", "Product", "Analytics",
];

const boardColumns = [
  {
    name: "To do",
    tint: "bg-primary",
    cards: [
      { title: "Q3 pricing decision", meta: "Decision · due Fri", tag: "Strategy" },
      { title: "Onboard Acme Health", meta: "Project · 6 tasks", tag: "Delivery" },
    ],
  },
  {
    name: "In progress",
    tint: "bg-info",
    cards: [
      { title: "Runway model v4", meta: "Finance · Selin", tag: "Finance" },
      { title: "Billing API rollout", meta: "Release · 72%", tag: "Product" },
    ],
  },
  {
    name: "Done",
    tint: "bg-success",
    cards: [{ title: "Seed round close", meta: "Closed · 12 Jun", tag: "Revenue" }],
  },
];

const Landing = () => {
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

          {/* Var olmayan sayfalara sahte menü yok: tek gerçek ankraj */}
          <div className="hidden items-center gap-1 md:flex">
            <a href="#features" className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              Product
            </a>
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

      {/* Hero */}
      <section className="border-b border-border bg-canvas px-6 pb-0 pt-16">
        <div className="mx-auto max-w-[1000px] text-center">
          <div className="inline-flex h-7 items-center gap-2 rounded-full border border-border bg-background px-3 text-[11.5px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            The Operating System for founders
          </div>

          <h1 className="mx-auto mt-6 max-w-[860px] text-[clamp(2.5rem,5.4vw,4.25rem)] font-semibold leading-[1.03] tracking-[-0.035em]">
            Where your company's<br className="hidden sm:block" /> work actually lives
          </h1>

          <p className="mx-auto mt-5 max-w-[600px] text-[16.5px] leading-relaxed text-muted-foreground">
            Projects, CRM, Finance, Goals and Decisions in one workspace — connected by a Company
            Graph and a Chief of Staff AI that knows your business.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-[14.5px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex h-11 items-center rounded-md border border-input bg-background px-6 text-[14.5px] font-medium transition-colors hover:bg-secondary"
            >
              See how it works
            </a>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-muted-foreground">
            {["Free to start", "No credit card", "2-minute setup"].map(t => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Product mock */}
        <div className="mx-auto mt-14 max-w-[1120px]">
          <div className="overflow-hidden rounded-t-xl border border-b-0 border-border bg-background shadow-[0_-2px_40px_-12px_rgba(0,0,0,0.18)]">
            <div className="flex">
              {/* rail */}
              <div className="hidden w-[52px] shrink-0 flex-col items-center gap-3 bg-sidebar py-3 sm:flex">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
                  <StackedLogo size={12} color="currentColor" />
                </span>
                {[0, 1, 2, 3, 4].map(i => (
                  <span key={i} className={`h-6 w-6 rounded-md ${i === 1 ? "bg-sidebar-accent" : "bg-sidebar-accent/40"}`} />
                ))}
              </div>
              {/* sidebar */}
              <div className="hidden w-[176px] shrink-0 flex-col gap-2 bg-sidebar px-3 py-3 md:flex">
                <div className="flex h-7 items-center justify-center gap-1.5 rounded-full bg-primary text-[11.5px] font-medium text-primary-foreground">
                  <Plus className="h-3 w-3" /> Create
                </div>
                <div className="mt-2 space-y-1">
                  {modules.slice(0, 7).map((m, i) => (
                    <div
                      key={m}
                      className={`flex h-7 items-center gap-2 rounded-md px-2 text-[11.5px] ${
                        i === 0 ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground"
                      }`}
                    >
                      <span className="h-2.5 w-2.5 rounded-sm bg-current opacity-50" />
                      {m}
                    </div>
                  ))}
                </div>
              </div>
              {/* content */}
              <div className="min-w-0 flex-1">
                <div className="flex h-11 items-center gap-3 border-b border-border px-4">
                  <span className="text-[12px] text-muted-foreground">Work</span>
                  <span className="text-[12px] text-muted-foreground">/</span>
                  <span className="text-[12px] font-medium">Growth roadmap</span>
                  <div className="ml-auto hidden h-7 w-[240px] items-center gap-2 rounded-full bg-secondary px-3 text-[11.5px] text-muted-foreground sm:flex">
                    <Search className="h-3 w-3" /> Search
                  </div>
                </div>
                <div className="flex h-10 items-center gap-1 border-b border-border px-4">
                  {["Overview", "Board", "List", "Timeline", "Dashboard"].map((t, i) => (
                    <span key={t} className="asana-tab !h-10 !px-2.5 !text-[12px]" data-active={i === 1}>
                      {t}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3 bg-canvas p-4">
                  {boardColumns.map(col => (
                    <div key={col.name} className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[11.5px] font-medium">
                        <span className={`h-2 w-2 rounded-full ${col.tint}`} />
                        {col.name}
                      </div>
                      {col.cards.map(c => (
                        <div key={c.title} className="rounded-lg border border-border bg-background p-2.5 shadow-sm">
                          <div className="flex items-start gap-1.5">
                            <Circle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="text-[11.5px] font-medium leading-snug">{c.title}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">{c.meta}</span>
                            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9.5px] font-medium text-muted-foreground">
                              {c.tag}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo strip */}
      <section className="border-b border-border px-6 py-10">
        <div className="mx-auto max-w-[1000px]">
          <p className="text-center text-[11.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Built for teams that run lean
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-60">
            {["Northwind", "Kestrel Labs", "Acme Health", "Volta", "Bright & Co", "Meridian"].map(n => (
              <span key={n} className="text-[15px] font-semibold tracking-tight">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20">
        <div className="mx-auto max-w-[1120px]">
          <div className="max-w-[620px]">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-primary">
              One workspace
            </span>
            <h2 className="mt-3 text-[clamp(1.8rem,3.4vw,2.6rem)] font-semibold leading-tight tracking-[-0.03em]">
              Every part of the company, in the same system
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-muted-foreground">
              Stop stitching five tools together. FounderOS links a project to its customer, budget,
              goal, risk and the decision that started it.
            </p>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {features.map(f => (
              <div key={f.title} className="bg-background p-6 transition-colors hover:bg-canvas">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-[18px] w-[18px]" />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Split section */}
      <section className="border-y border-border bg-canvas px-6 py-20">
        <div className="mx-auto grid max-w-[1120px] items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-primary">
              Decision system of record
            </span>
            <h2 className="mt-3 text-[clamp(1.7rem,3.2vw,2.4rem)] font-semibold leading-tight tracking-[-0.03em]">
              Companies record outcomes. We record the decision itself.
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-muted-foreground">
              Capture the context, the options, the confidence level and the expected result — then
              let FounderOS show you what actually happened months later.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Context snapshot frozen at decision time",
                "Expected vs. realised outcome reviews",
                "Every task, expense and risk linked back to its decision",
              ].map(t => (
                <li key={t} className="flex items-start gap-2.5 text-[14px]">
                  <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {t}
                </li>
              ))}
            </ul>
            <Link
              to="/auth"
              className="mt-7 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold">Pricing change — EU tier</span>
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                Reviewed
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Raise EU list price by 12% to protect margin after FX shift. Confidence at decision: 70%.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
              {[
                { k: "Expected ARR", v: "+€180k" },
                { k: "Realised", v: "+€146k" },
                { k: "Churn delta", v: "+0.8pt" },
              ].map(m => (
                <div key={m.k}>
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{m.k}</div>
                  <div className="mt-0.5 text-[15px] font-semibold tabular">{m.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-[900px] text-center">
          <h2 className="text-[clamp(1.5rem,2.6vw,2rem)] font-semibold tracking-[-0.03em]">
            All modules included
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {modules.map(m => (
              <span key={m} className="rounded-full border border-border bg-secondary px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground">
                {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-[1120px] rounded-2xl bg-sidebar px-8 py-14 text-center">
          <h2 className="mx-auto max-w-[620px] text-[clamp(1.7rem,3.2vw,2.4rem)] font-semibold leading-tight tracking-[-0.03em] text-sidebar-accent-foreground">
            Run the whole company from one place
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[15px] text-sidebar-foreground">
            Set up your workspace in two minutes. Invite your team when you're ready.
          </p>
          <Link
            to="/auth"
            className="mt-7 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-[14.5px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
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
            <a href="#features" className="transition-colors hover:text-foreground">Product</a>
          </div>
          <span className="text-[12.5px] text-muted-foreground">© {new Date().getFullYear()} FounderOS</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
