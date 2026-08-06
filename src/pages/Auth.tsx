import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, Sparkles, Target, BarChart3, Linkedin } from "lucide-react";
import { SparkLogo } from "@/components/SparkLogo";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLinkedInLoading, setIsLinkedInLoading] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (error) toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
    } catch (error: any) {
      toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Both providers must be enabled in Supabase Dashboard → Authentication →
  // Providers, with Client ID / Secret + the callback URL
  // https://<PROJECT>.supabase.co/auth/v1/callback registered on the
  // provider's side. See docs/SSO.md.
  const oauth = async (
    provider: "linkedin_oidc" | "azure",
    setLoading: (v: boolean) => void,
    label: string,
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
          scopes: provider === "azure" ? "email openid profile" : undefined,
        },
      });
      if (error) toast({ title: `${label} sign-in failed`, description: error.message, variant: "destructive" });
    } catch (error: any) {
      toast({ title: `${label} sign-in failed`, description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  const handleLinkedInSignIn  = () => oauth("linkedin_oidc", setIsLinkedInLoading, "LinkedIn");
  const handleMicrosoftSignIn = () => oauth("azure",         setIsMicrosoftLoading, "Microsoft");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signIn(loginEmail, loginPassword);
      toast({ title: "Welcome back!" });
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await signUp(signupEmail, signupPassword, signupName);
      toast({ title: "Account created!", description: "Check your email to confirm your account." });
    } catch (error: any) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <p className="mt-1 text-[13px] text-muted-foreground">Sign in or create your workspace to continue.</p>
          </div>

          <Button
            variant="outline"
            className="w-full h-10 gap-2 text-[13px]"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-10 gap-2 text-[13px]"
              onClick={handleLinkedInSignIn}
              disabled={isLinkedInLoading}
            >
              {isLinkedInLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Linkedin className="h-4 w-4" />}
              LinkedIn
            </Button>
            <Button
              variant="outline"
              className="h-10 gap-2 text-[13px]"
              onClick={handleMicrosoftSignIn}
              disabled={isMicrosoftLoading}
            >
              {isMicrosoftLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="1"  y="1"  width="10" height="10" fill="currentColor" />
                  <rect x="13" y="1"  width="10" height="10" fill="currentColor" opacity="0.75" />
                  <rect x="1"  y="13" width="10" height="10" fill="currentColor" opacity="0.5" />
                  <rect x="13" y="13" width="10" height="10" fill="currentColor" opacity="0.35" />
                </svg>
              )}
              Microsoft
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="login" className="text-[12px]">Sign in</TabsTrigger>
              <TabsTrigger value="signup" className="text-[12px]">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-5">
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Email</Label>
                  <Input type="email" placeholder="you@company.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className="h-9 text-[13px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Password</Label>
                  <Input type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className="h-9 text-[13px]" />
                </div>
                <Button type="submit" className="w-full h-9 text-[13px] font-medium" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-5">
              <form onSubmit={handleSignup} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Full name</Label>
                  <Input type="text" placeholder="Jane Doe" value={signupName} onChange={(e) => setSignupName(e.target.value)} required className="h-9 text-[13px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Work email</Label>
                  <Input type="email" placeholder="you@company.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required className="h-9 text-[13px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Password</Label>
                  <Input type="password" placeholder="Min 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={6} className="h-9 text-[13px]" />
                </div>
                <Button type="submit" className="w-full h-9 text-[13px] font-medium" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Create workspace
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-[11px] text-muted-foreground text-center pt-2">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
