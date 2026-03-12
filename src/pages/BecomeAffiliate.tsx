import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import AffiliateBanner from "@/components/landing/AffiliateBanner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const benefits = [
  {
    number: "10%",
    title: "Discount for Customers",
    description: "Get your own unique discount code to share with your audience. Your followers save 10% on every order."
  },
  {
    number: "10%",
    title: "Commission for You",
    description: "Earn 10% commission on every sale made using your code. No caps, no limits."
  },
  {
    number: "∞",
    title: "Unlimited Earning",
    description: "Share your code on Instagram, TikTok, or anywhere you like. We track every sale automatically."
  }
];

const steps = [
  { number: "01", text: "Create your affiliate account" },
  { number: "02", text: "Choose your unique discount code" },
  { number: "03", text: "Share it with your audience" },
  { number: "04", text: "Earn commission on every sale" }
];

const BecomeAffiliate = () => {
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Auth form
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Signup form
  const [fullName, setFullName] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    isMounted.current = true;

    const checkAffiliateSafe = async (userId: string) => {
      try {
        const { data } = await supabase
          .from("affiliates")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (!isMounted.current) return;
        if (data) {
          navigate("/affiliates");
          return; // don't clear checkingAuth — we're navigating away
        }
      } catch (err) {
        console.error("Affiliate check failed:", err);
      }
      if (isMounted.current) setCheckingAuth(false);
    };

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted.current) return;
        if (session?.user) {
          setUser(session.user);
          await checkAffiliateSafe(session.user.id);
        } else {
          setUser(null);
          setCheckingAuth(false);
        }
      } catch (err) {
        console.error("Auth init failed:", err);
        if (isMounted.current) setCheckingAuth(false);
      }
    };

    initAuth();

    // Timeout safeguard — never spin forever
    const timeout = setTimeout(() => {
      if (isMounted.current) setCheckingAuth(false);
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted.current) return;
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (newUser) {
        checkAffiliateSafe(newUser.id);
      } else {
        setCheckingAuth(false);
      }
    });

    return () => {
      isMounted.current = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/become-an-affiliate` },
        });
        if (error) {
          // Detect "user already exists" and auto-switch to login
          if (error.message?.toLowerCase().includes("already") || error.status === 422) {
            setIsLogin(true);
            toast.info("Account already exists — please sign in instead.");
            return;
          }
          throw error;
        }
        toast.success("Check your email to confirm your account, then come back here!");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAffiliateSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliate-signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            full_name: fullName,
            discount_code: discountCode,
            instagram_handle: instagramHandle || undefined,
            tiktok_handle: tiktokHandle || undefined,
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to sign up");

      toast.success("Welcome to the affiliate program! 🎉");
      navigate("/affiliates");
    } catch (err: any) {
      if (err.name === "AbortError") {
        toast.error("Request timed out. Please try again.");
      } else {
        toast.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderHeroForm = () => {
    if (checkingAuth) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      );
    }

    if (!user) {
      return (
        <Card className="rounded-3xl max-w-md mx-auto text-left">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-center text-muted-foreground mb-4">
              {isLogin ? "Sign in to your account" : "Create your affiliate account"}
            </p>
            <form onSubmit={handleAuth} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="hero-email">Email</Label>
                <Input
                  id="hero-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hero-password">Password</Label>
                <Input
                  id="hero-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="rounded-xl"
                />
              </div>
              <Button type="submit" className="w-full rounded-2xl" disabled={authLoading}>
                {authLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>
            <div className="mt-3 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="rounded-3xl max-w-md mx-auto text-left">
        <CardContent className="p-6">
          <p className="text-sm font-medium text-center text-muted-foreground mb-4">
            Choose your affiliate details
          </p>
          <form onSubmit={handleAffiliateSignup} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="hero-name">Full Name *</Label>
              <Input
                id="hero-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hero-code">Your Discount Code *</Label>
              <Input
                id="hero-code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                placeholder="e.g. MYCODE10"
                required
                maxLength={20}
                minLength={3}
                className="rounded-xl uppercase"
              />
              <p className="text-xs text-muted-foreground">
                3–20 characters. This gives customers 10% off.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hero-instagram">Instagram Handle (optional)</Label>
              <Input
                id="hero-instagram"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                placeholder="@yourhandle"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hero-tiktok">TikTok Handle (optional)</Label>
              <Input
                id="hero-tiktok"
                value={tiktokHandle}
                onChange={(e) => setTiktokHandle(e.target.value)}
                placeholder="@yourhandle"
                className="rounded-xl"
              />
            </div>
            <Button type="submit" className="w-full rounded-2xl" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Join Affiliate Program
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section id="signup-form" className="pt-32 pb-24 bg-cream">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground mb-6 uppercase">
            Share the Love.<br />Earn the Rewards.
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            Love Piccoload? Join our affiliate programme and earn money doing what you already do — sharing amazing things with your audience.
          </p>
          {renderHeroForm()}
        </div>
      </section>

      {/* Benefits */}
      <section className="pt-24 pb-0">
        <div className="container mx-auto px-4 max-w-5xl pb-24">
          <p className="text-sm tracking-[0.3em] uppercase text-muted-foreground text-center mb-3 font-medium">
            Why Join?
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground text-center mb-16 uppercase">
            Everyone Wins
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="text-left p-8 rounded-lg border border-border bg-cream"
              >
                <span className="font-display text-5xl font-bold text-foreground block mb-2">
                  {benefit.number}
                </span>
                <h3 className="font-sans text-base font-extrabold text-foreground mb-3 uppercase">
                  {benefit.title}
                </h3>
                <p className="text-foreground text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
        <AffiliateBanner />
      </section>

      {/* How It Works */}
      <section className="pt-24 pb-24 bg-cream">
        <div className="container mx-auto px-4 max-w-2xl">
          <p className="text-sm tracking-[0.3em] uppercase text-muted-foreground text-center mb-3 font-medium">
            Getting Started
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground text-center mb-16 uppercase">
            How It Works
          </h2>
          <div className="space-y-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex items-center gap-6 bg-background rounded-lg p-5 border border-border"
              >
                <span className="font-display text-2xl font-bold text-foreground w-10 shrink-0">
                  {step.number}
                </span>
                <div className="h-px flex-1 bg-border hidden sm:block" />
                <p className="text-base text-foreground font-medium flex-1">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/why-piccolo-family.webp"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="container mx-auto px-4 text-center max-w-2xl relative z-10 py-24">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-6 uppercase">
            Ready to Start?
          </h2>
          <p className="text-foreground text-base mb-10 max-w-md mx-auto leading-relaxed">
            It only takes a minute to sign up. No fees, no obligations - just share and earn.
          </p>
          <Button
            size="lg"
            className="rounded-lg text-base px-10 py-6 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => document.getElementById('signup-form')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Become an Affiliate
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BecomeAffiliate;
