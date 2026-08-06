import { Link } from "react-router-dom";
import { Shield, Lock, Database, Globe, Trash2, Server, CheckCircle2, ArrowRight } from "lucide-react";
import { StackedLogo } from "@/components/StackedLogo";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const subprocessors = [
  { name: "Supabase", role: "Database & Auth", location: "Frankfurt, Germany" },
  { name: "Vercel", role: "Hosting", location: "Global CDN" },
  { name: "Lovable AI", role: "AI Gateway", location: "EU" },
];

const Security = () => {
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
            <Link to="/changelog" className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              Changelog
            </Link>
            <Link to="/security" className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-foreground transition-colors hover:text-foreground">
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

      {/* Hero */}
      <section className="border-b border-border bg-canvas px-6 py-20">
        <div className="mx-auto max-w-[800px] text-center">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-[clamp(2rem,4.2vw,3rem)] font-semibold leading-tight tracking-[-0.03em]">
            Security at FounderOS
          </h1>
          <p className="mx-auto mt-4 max-w-[580px] text-[16px] leading-relaxed text-muted-foreground">
            Enterprise-grade security built into every layer. Your company data is isolated, encrypted, and protected by default -- not as an afterthought.
          </p>
        </div>
      </section>

      {/* Sections */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-[900px] space-y-8">

          {/* Row-Level Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10">
                  <Database className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <CardTitle className="text-[18px]">Row-Level Security</CardTitle>
                  <CardDescription>Complete workspace isolation at the database level</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-[14px] leading-relaxed text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Every table in the database has Row-Level Security (RLS) policies enabled. There are no exceptions.
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Workspace isolation is enforced at the query level. A user in Workspace A can never read, write, or reference data belonging to Workspace B.
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  The <code className="rounded bg-secondary px-1.5 py-0.5 text-[13px] font-mono">is_workspace_member()</code> check runs on every SELECT, INSERT, UPDATE, and DELETE operation to verify the requesting user belongs to the target workspace.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Encryption */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10">
                  <Lock className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <CardTitle className="text-[18px]">Encryption</CardTitle>
                  <CardDescription>Data protected at rest and in transit</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-[14px] leading-relaxed text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  All data at rest is encrypted using AES-256 encryption. Database volumes, backups, and file storage are all covered.
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  All data in transit is protected with TLS 1.3. Every connection between your browser, our API, and downstream services is encrypted end to end.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Backup */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10">
                  <Server className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <CardTitle className="text-[18px]">Backup & Recovery</CardTitle>
                  <CardDescription>Automated backups with point-in-time recovery</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-[14px] leading-relaxed text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Daily automated backups are taken of the entire database. Backups are stored in a separate region from the primary database for disaster recovery.
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Point-in-time recovery allows restoring the database to any second within the retention window, minimising data loss in incident scenarios.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* GDPR */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10">
                  <Globe className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <CardTitle className="text-[18px]">GDPR Compliance</CardTitle>
                  <CardDescription>Full compliance with the EU General Data Protection Regulation</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-[14px] leading-relaxed text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  A Data Processing Agreement (DPA) is available for all customers. Contact us to receive a signed copy.
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Right to erasure: users can request complete deletion of their personal data and all associated records.
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Data portability: export all your workspace data in standard formats at any time from workspace settings.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* KVKK */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <CardTitle className="text-[18px]">KVKK Compliance</CardTitle>
                  <CardDescription>Compliance with Turkish Personal Data Protection Law (No. 6698)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-[14px] leading-relaxed text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  FounderOS complies with the Turkish Personal Data Protection Law (KVKK). Data processing is conducted in accordance with the principles of lawfulness, fairness, and transparency.
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Local data handling procedures follow KVKK requirements for cross-border data transfers, data controller obligations, and explicit consent mechanisms.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Deletion */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10">
                  <Trash2 className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <CardTitle className="text-[18px]">Data Deletion Request</CardTitle>
                  <CardDescription>Request complete deletion of your account and associated data</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-5 text-[14px] leading-relaxed text-muted-foreground">
                If you would like to delete your account and all data associated with it, submit a request below. We will process your request within 30 days in accordance with GDPR and KVKK requirements.
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="deletion-email" className="mb-1.5 block text-[13px] font-medium">
                    Email address
                  </label>
                  <input
                    id="deletion-email"
                    type="email"
                    placeholder="you@company.com"
                    className="h-10 w-full max-w-[400px] rounded-md border border-input bg-background px-3 text-[14px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    readOnly
                  />
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  onClick={() => {}}
                >
                  Submit deletion request
                </button>
                <p className="text-[12px] text-muted-foreground">
                  This form is for display purposes. To submit a deletion request, contact privacy@founderos.app.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Subprocessors */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10">
                  <Server className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <CardTitle className="text-[18px]">Subprocessors</CardTitle>
                  <CardDescription>Third-party services that process data on our behalf</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-[14px]">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 pr-6 font-medium">Provider</th>
                      <th className="pb-3 pr-6 font-medium">Purpose</th>
                      <th className="pb-3 font-medium">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subprocessors.map((sp) => (
                      <tr key={sp.name} className="border-b border-border last:border-0">
                        <td className="py-3 pr-6 font-medium">{sp.name}</td>
                        <td className="py-3 pr-6 text-muted-foreground">{sp.role}</td>
                        <td className="py-3 text-muted-foreground">{sp.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

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

export default Security;
