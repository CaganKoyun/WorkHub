import { Navigate, Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Sparkles, Target, BarChart3 } from "lucide-react";
import { SparkLogo } from "@/components/SparkLogo";

export default function Auth() {
  const { user, loading } = useAuth();
  const { loginWithRedirect } = useAuth0();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSignIn = () => loginWithRedirect();
  const handleSignUp = () =>
    loginWithRedirect({ authorizationParams: { screen_hint: "signup" } });

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left — brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{ backgroundImage: "radial-gradient(circle at 15% 15%, hsl(var(--primary)) 0%, transparent 55%)" }}
        />
        <Link to="/" className="relative flex items-center text-sidebar-accent-foreground">
          <SparkLogo size={18} />
        </Link>

        <div className="relative max-w-md space-y-8">
          <div>
            <h2 className="text-[30px] font-semibold leading-[1.12] tracking-tight text-sidebar-accent-foreground">
              Where your company's<br />work actually lives.
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-sidebar-foreground">
              Projects, CRM, Finance, Goals — one workspace, one Chief of Staff AI.
            </p>
          </div>

          <ul className="space-y-3">
            {[
              { icon: Target, label: "Goals & OKRs rolled up automatically" },
              { icon: Sparkles, label: "Domain-expert AI in every module" },
              { icon: BarChart3, label: "Cash, burn, runway — live from your data" },
            ].map(item => (
              <li key={item.label} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/20 text-primary">
                  <item.icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-[13.5px] text-sidebar-accent-foreground/90">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-4 text-[12px] text-sidebar-foreground">
          {["Free to start", "No credit card", "2-minute setup"].map(t => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[400px] space-y-6">
          <Link to="/" className="flex lg:hidden items-center text-foreground">
            <SparkLogo size={16} />
          </Link>

          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Welcome</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Sign in with Auth0 to access your workspace.
            </p>
          </div>

          <div className="space-y-3">
            <Button onClick={handleSignIn} className="w-full h-10 text-[13px] font-medium">
              Sign in with Auth0
            </Button>
            <Button
              onClick={handleSignUp}
              variant="outline"
              className="w-full h-10 text-[13px] font-medium"
            >
              Create a new account
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground text-center pt-2">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
