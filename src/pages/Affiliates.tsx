import { useState, useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, DollarSign, ShoppingBag, TrendingUp, Copy, CheckCircle2, Clock, Wallet, BanknoteIcon, Instagram, Star, Trophy, ExternalLink, Send } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.7a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.13z" />
  </svg>
);

/* ── Reward task definitions ── */
const REWARD_TASKS = [
  { key: "tiktok_video", label: "Post a TikTok video featuring Piccoload", points: 50, icon: "tiktok" },
  { key: "tiktok_review", label: "Post a TikTok review/unboxing", points: 75, icon: "tiktok" },
  { key: "instagram_story", label: "Share an Instagram Story about Piccoload", points: 25, icon: "instagram" },
  { key: "instagram_reel", label: "Post an Instagram Reel featuring Piccoload", points: 50, icon: "instagram" },
  { key: "instagram_post", label: "Create an Instagram post with your book", points: 40, icon: "instagram" },
  { key: "facebook_post", label: "Share on Facebook with a review", points: 20, icon: "star" },
  { key: "blog_review", label: "Write a blog post/review about Piccoload", points: 100, icon: "star" },
  { key: "youtube_video", label: "Create a YouTube video featuring Piccoload", points: 100, icon: "star" },
] as const;

const COMMISSION_TIERS = [
  { tier: 1, rate: 10, label: "Bronze", minPoints: 0, color: "#CD7F32", bg: "from-amber-700/20 to-amber-900/10", border: "border-amber-600/40", badge: "bg-amber-700 text-white", icon: "🥉" },
  { tier: 2, rate: 12, label: "Silver", minPoints: 200, color: "#A8A8A8", bg: "from-slate-300/30 to-slate-400/10", border: "border-slate-400/50", badge: "bg-slate-500 text-white", icon: "🥈" },
  { tier: 3, rate: 15, label: "Gold", minPoints: 500, color: "#FFD700", bg: "from-yellow-300/30 to-amber-400/10", border: "border-yellow-500/50", badge: "bg-yellow-500 text-black", icon: "🥇" },
];

interface RewardSubmission {
  id: string;
  task_key: string;
  proof_url: string;
  points: number;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface Affiliate {
  id: string;
  full_name: string;
  email: string;
  discount_code: string;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  total_orders: number;
  total_revenue: number;
  total_commission: number;
  commission_tier: number;
  total_points: number;
  created_at: string;
}

interface AffiliateOrder {
  id: string;
  shopify_order_number: string | null;
  order_total: number;
  commission: number;
  created_at: string;
  payout_eligible_at: string | null;
}

interface AffiliatePayout {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  notes: string | null;
}

const Affiliates = () => {
  
  const [user, setUser] = useState<any>(null);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [orders, setOrders] = useState<AffiliateOrder[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [rewardSubmissions, setRewardSubmissions] = useState<RewardSubmission[]>([]);
  const [editingSocials, setEditingSocials] = useState(false);
  const [editIg, setEditIg] = useState("");
  const [editTt, setEditTt] = useState("");
  const [savingSocials, setSavingSocials] = useState(false);
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const [submittingReward, setSubmittingReward] = useState<string | null>(null);

  // Auth form state
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Signup form state
  const [fullName, setFullName] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [tiktokHandle, setTiktokHandle] = useState("");

  useEffect(() => {
    let initialCheckDone = false;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        if (!initialCheckDone) {
          initialCheckDone = true;
          fetchAffiliateData(session.user.id);
        }
      } else {
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        if (!initialCheckDone) {
          initialCheckDone = true;
          fetchAffiliateData(session.user.id);
        }
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAffiliateData = async (userId: string) => {
    setLoading(true);
    try {
      const { data: aff } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (aff) {
        setAffiliate(aff as Affiliate);
        setEditIg(aff.instagram_handle || "");
        setEditTt(aff.tiktok_handle || "");
        // Fetch affiliate orders, payouts, and reward submissions in parallel
        const [ordersRes, payoutsRes, rewardsRes] = await Promise.all([
          supabase
            .from("affiliate_orders")
            .select("*")
            .eq("affiliate_id", aff.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("affiliate_payouts")
            .select("*")
            .eq("affiliate_id", aff.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("affiliate_reward_submissions")
            .select("*")
            .eq("affiliate_id", aff.id)
            .order("created_at", { ascending: false }),
        ]);
        setOrders((ordersRes.data as AffiliateOrder[]) || []);
        setPayouts((payoutsRes.data as AffiliatePayout[]) || []);
        setRewardSubmissions((rewardsRes.data as RewardSubmission[]) || []);
      }
    } catch (err) {
      console.error("Error fetching affiliate data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate available and pending balances
  const now = new Date();
  const availableCommission = orders
    .filter(o => o.payout_eligible_at && new Date(o.payout_eligible_at) <= now)
    .reduce((sum, o) => sum + Number(o.commission), 0);
  const pendingCommission = orders
    .filter(o => !o.payout_eligible_at || new Date(o.payout_eligible_at) > now)
    .reduce((sum, o) => sum + Number(o.commission), 0);
  const totalPaidOut = payouts
    .filter(p => p.status !== "rejected")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const availableBalance = Math.max(0, availableCommission - totalPaidOut);

  const handleRequestPayout = async () => {
    if (!affiliate || availableBalance <= 0) return;
    setRequestingPayout(true);
    try {
      const { error } = await supabase
        .from("affiliate_payouts")
        .insert({
          affiliate_id: affiliate.id,
          amount: availableBalance,
        });
      if (error) throw error;
      toast.success("Payout request submitted! We'll process it shortly.");
      fetchAffiliateData(user.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to request payout");
    } finally {
      setRequestingPayout(false);
    }
  };

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
          options: { emailRedirectTo: `${window.location.origin}/affiliates` },
        });
        if (error) throw error;
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

    const watchdog = setTimeout(() => {
      setSubmitting(false);
      toast.error("Request timed out. Please try again.");
    }, 20000);

    try {
      const result = await Promise.race([
        supabase.functions.invoke("affiliate-signup", {
          body: {
            full_name: fullName,
            discount_code: discountCode,
            instagram_handle: instagramHandle || null,
            tiktok_handle: tiktokHandle || null,
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT")), 15000)
        ),
      ]);

      const { data, error } = result as { data: any; error: any };
      if (error) throw new Error(error.message || "Request failed");
      if (data?.error) {
        if (data.error.includes("already have an affiliate")) {
          toast.info("You already have an affiliate account!");
          fetchAffiliateData(user.id);
          return;
        }
        throw new Error(data.error);
      }

      toast.success("Welcome to the affiliate program! 🎉");
      fetchAffiliateData(user.id);
    } catch (err: any) {
      if (err.message === "TIMEOUT") {
        toast.error("Request timed out. Please try again.");
      } else {
        toast.error(err.message || "Something went wrong");
      }
    } finally {
      clearTimeout(watchdog);
      setSubmitting(false);
    }
  };

  const copyCode = () => {
    if (affiliate?.discount_code) {
      navigator.clipboard.writeText(affiliate.discount_code);
      setCopied(true);
      toast.success("Discount code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveSocials = async () => {
    if (!affiliate) return;
    setSavingSocials(true);
    try {
      const { error } = await supabase
        .from("affiliates")
        .update({ instagram_handle: editIg || null, tiktok_handle: editTt || null })
        .eq("id", affiliate.id);
      if (error) throw error;
      setAffiliate({ ...affiliate, instagram_handle: editIg || null, tiktok_handle: editTt || null });
      setEditingSocials(false);
      toast.success("Social accounts updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSavingSocials(false);
    }
  };

  const handleSubmitReward = async (taskKey: string) => {
    if (!affiliate) return;
    const url = proofUrls[taskKey]?.trim();
    if (!url) { toast.error("Please enter a link to your content"); return; }
    const task = REWARD_TASKS.find((t) => t.key === taskKey);
    if (!task) return;
    setSubmittingReward(taskKey);
    try {
      const { error } = await supabase
        .from("affiliate_reward_submissions")
        .insert({
          affiliate_id: affiliate.id,
          task_key: taskKey,
          proof_url: url,
          points: task.points,
        });
      if (error) throw error;
      toast.success("Submission sent for review!");
      setProofUrls((prev) => ({ ...prev, [taskKey]: "" }));
      fetchAffiliateData(user.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setSubmittingReward(null);
    }
  };

  const currentTier = COMMISSION_TIERS.find((t) => t.tier === (affiliate?.commission_tier ?? 1)) || COMMISSION_TIERS[0];
  const nextTier = COMMISSION_TIERS.find((t) => t.tier === currentTier.tier + 1);
  const totalPoints = affiliate?.total_points ?? 0;

  const payoutStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "default";
      case "rejected": return "destructive";
      default: return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  // Step 1: Not logged in — show auth
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-lg">
            <div className="text-center mb-10">
              <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
                BECOME AN AFFILIATE
              </h1>
              <p className="text-muted-foreground text-lg">
                Earn 10% commission on every sale you refer. Share your unique discount code
                and your customers save 10% too!
              </p>
            </div>

            <Card className="rounded-3xl">
              <CardHeader className="text-center">
                <CardTitle className="font-display text-2xl">
                  {isLogin ? "Sign In" : "Create Account"}
                </CardTitle>
                <CardDescription>
                  {isLogin
                    ? "Sign in to your affiliate account"
                    : "Create an account to become an affiliate"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
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
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Step 2: Logged in but not yet an affiliate — show signup form
  if (!affiliate) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-lg">
            <div className="text-center mb-10">
              <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
                BECOME AN AFFILIATE
              </h1>
              <p className="text-muted-foreground text-lg">
                Choose your unique discount code below. Your customers get 10% off and you earn
                10% commission on every sale!
              </p>
            </div>

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="font-display text-xl">Your Affiliate Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAffiliateSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      required
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discountCode">Choose Your Discount Code *</Label>
                    <Input
                      id="discountCode"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                      placeholder="e.g. MYCODE10"
                      required
                      maxLength={20}
                      minLength={3}
                      className="rounded-xl uppercase"
                    />
                    <p className="text-xs text-muted-foreground">
                      3–20 characters, letters, numbers, hyphens and underscores only. This will give customers 10% off.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram Handle (optional)</Label>
                    <Input
                      id="instagram"
                      value={instagramHandle}
                      onChange={(e) => setInstagramHandle(e.target.value)}
                      placeholder="@yourhandle"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tiktok">TikTok Handle (optional)</Label>
                    <Input
                      id="tiktok"
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
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Step 3: Affiliate dashboard
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-10">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-2">
              AFFILIATE DASHBOARD
            </h1>
            <p className="text-muted-foreground text-lg">
              Welcome back, {affiliate.full_name}!
            </p>
          </div>

          {/* Discount Code Card */}
          <Card className="rounded-3xl mb-8 bg-foreground text-background">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm opacity-70 mb-1">Your Discount Code</p>
                <p className="text-3xl font-bold font-display tracking-wider">{affiliate.discount_code}</p>
                <p className="text-sm opacity-70 mt-1">Customers save 10% · You earn {currentTier.rate}% commission</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl border-background/30 text-background hover:bg-background/10"
                onClick={copyCode}
              >
                {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </Button>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <Card className="rounded-2xl">
              <CardContent className="p-6 text-center">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-3xl font-bold font-display">{affiliate.total_orders}</p>
                <p className="text-sm text-muted-foreground">Total Orders</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-3xl font-bold font-display">£{Number(affiliate.total_revenue).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="p-6 text-center">
                <Wallet className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-3xl font-bold font-display">£{availableBalance.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="p-6 text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-3xl font-bold font-display">£{pendingCommission.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Pending (60 days)</p>
              </CardContent>
            </Card>
          </div>

          {/* Commission Tier — Bronze / Silver / Gold */}
          <div className="rounded-3xl mb-8 overflow-hidden border border-border" style={{ background: `linear-gradient(135deg, ${currentTier.color}15, ${currentTier.color}05)` }}>
            <div className="p-6 sm:p-8">
              {/* Current tier hero */}
              <div className="flex items-center gap-4 mb-6">
                <div className="text-5xl">{currentTier.icon}</div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${currentTier.badge}`}>
                      {currentTier.label} Tier
                    </span>
                    <span className="text-sm text-muted-foreground">{totalPoints} pts</span>
                  </div>
                  <p className="text-2xl font-bold font-display">{currentTier.rate}% commission</p>
                </div>
              </div>

              {/* Progress bar to next tier */}
              {nextTier && (
                <div className="mb-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium" style={{ color: currentTier.color }}>{currentTier.icon} {currentTier.label}</span>
                    <span className="font-medium" style={{ color: nextTier.color }}>{nextTier.label} {nextTier.icon}</span>
                  </div>
                  <div className="w-full bg-muted/60 rounded-full h-4 overflow-hidden relative">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.min(100, (totalPoints / nextTier.minPoints) * 100)}%`,
                        background: `linear-gradient(90deg, ${currentTier.color}, ${nextTier.color})`,
                      }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-foreground/70">
                      {totalPoints} / {nextTier.minPoints}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 text-center">
                    {nextTier.minPoints - totalPoints > 0
                      ? `Earn ${nextTier.minPoints - totalPoints} more points to unlock ${nextTier.label} (${nextTier.rate}% commission)`
                      : `You qualify for ${nextTier.label}!`}
                  </p>
                </div>
              )}
              {!nextTier && (
                <p className="text-sm font-medium mb-6" style={{ color: currentTier.color }}>
                  You've reached the highest tier — maximum commission unlocked!
                </p>
              )}

              {/* Three tier cards */}
              <div className="grid grid-cols-3 gap-3">
                {COMMISSION_TIERS.map((t) => {
                  const isActive = t.tier === currentTier.tier;
                  const isLocked = t.tier > currentTier.tier;
                  return (
                    <div
                      key={t.tier}
                      className={`rounded-2xl border-2 p-4 text-center transition-all relative overflow-hidden ${
                        isActive ? t.border + " shadow-md" : isLocked ? "border-border/40 opacity-60" : t.border + " opacity-80"
                      }`}
                      style={isActive ? { background: `linear-gradient(135deg, ${t.color}18, ${t.color}08)` } : {}}
                    >
                      {isActive && (
                        <div className="absolute top-0 right-0 px-2 py-0.5 text-[9px] font-bold rounded-bl-lg" style={{ background: t.color, color: t.tier === 3 ? '#000' : '#fff' }}>
                          CURRENT
                        </div>
                      )}
                      <div className="text-2xl mb-1">{t.icon}</div>
                      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: t.color }}>{t.label}</p>
                      <p className="text-2xl font-bold font-display mt-1">{t.rate}%</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t.minPoints}+ points</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Social Media Accounts */}
          <div className="rounded-3xl mb-8 overflow-hidden border border-border bg-gradient-to-br from-pink-50/80 via-purple-50/50 to-blue-50/80 dark:from-pink-950/20 dark:via-purple-950/10 dark:to-blue-950/20">
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <Instagram className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold">Your Social Accounts</h3>
                    <p className="text-xs text-muted-foreground">Link accounts to verify content submissions</p>
                  </div>
                </div>
                {!editingSocials && (
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setEditingSocials(true)}>
                    Edit
                  </Button>
                )}
              </div>
              {editingSocials ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Instagram className="w-4 h-4" /> Instagram</Label>
                    <Input
                      value={editIg}
                      onChange={(e) => setEditIg(e.target.value)}
                      placeholder="@yourhandle"
                      className="rounded-xl bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><TikTokIcon className="w-4 h-4" /> TikTok</Label>
                    <Input
                      value={editTt}
                      onChange={(e) => setEditTt(e.target.value)}
                      placeholder="@yourhandle"
                      className="rounded-xl bg-background"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button className="rounded-xl" onClick={handleSaveSocials} disabled={savingSocials}>
                      {savingSocials && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => { setEditingSocials(false); setEditIg(affiliate?.instagram_handle || ""); setEditTt(affiliate?.tiktok_handle || ""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-background/80 rounded-2xl border border-pink-200/50 dark:border-pink-800/30">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Instagram className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Instagram</p>
                      <p className="font-semibold">{affiliate?.instagram_handle || "Not linked yet"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-background/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/30">
                    <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                      <TikTokIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">TikTok</p>
                      <p className="font-semibold">{affiliate?.tiktok_handle || "Not linked yet"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rewards / Content Tasks */}
          <div className="rounded-3xl mb-8 overflow-hidden border border-border bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-yellow-50/80 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-yellow-950/20">
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold">Earn Rewards</h3>
                  <p className="text-xs text-muted-foreground">Create content, earn points, unlock higher commission tiers</p>
                </div>
              </div>

              {/* Mini progress reminder */}
              {nextTier && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-background/60 border border-amber-200/50 dark:border-amber-800/30 mb-5 mt-4">
                  <span className="text-xl">{nextTier.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium">Progress to {nextTier.label}</span>
                      <span className="font-bold" style={{ color: nextTier.color }}>{totalPoints}/{nextTier.minPoints} pts</span>
                    </div>
                    <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (totalPoints / nextTier.minPoints) * 100)}%`,
                          background: `linear-gradient(90deg, ${currentTier.color}, ${nextTier.color})`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 mt-4">
                {REWARD_TASKS.map((task) => {
                  const submissions = rewardSubmissions.filter((s) => s.task_key === task.key);
                  const hasPending = submissions.some((s) => s.status === "pending");
                  const hasApproved = submissions.some((s) => s.status === "approved");
                  const iconBg = task.icon === "tiktok" ? "bg-black" : task.icon === "instagram" ? "bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600" : "bg-gradient-to-br from-blue-500 to-indigo-600";
                  return (
                    <div key={task.key} className={`rounded-2xl p-4 transition-all ${hasApproved ? "bg-green-50/80 border border-green-200/60 dark:bg-green-950/20 dark:border-green-800/30" : "bg-background/80 border border-amber-200/40 dark:border-amber-800/20 hover:border-amber-300/60"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                            {task.icon === "tiktok" && <TikTokIcon className="w-4 h-4 text-white" />}
                            {task.icon === "instagram" && <Instagram className="w-4 h-4 text-white" />}
                            {task.icon === "star" && <Star className="w-4 h-4 text-white" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{task.label}</p>
                            <span className="inline-flex items-center gap-1 mt-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                              <Star className="w-3 h-3 fill-current" /> +{task.points} pts
                            </span>
                          </div>
                        </div>
                        {submissions.length > 0 && (
                          <div className="flex gap-1 flex-shrink-0">
                            {submissions.map((s) => (
                              <Badge
                                key={s.id}
                                className={`text-[10px] ${
                                  s.status === "approved" ? "bg-green-500 text-white hover:bg-green-500" :
                                  s.status === "rejected" ? "bg-red-500 text-white hover:bg-red-500" :
                                  "bg-amber-500 text-white hover:bg-amber-500"
                                }`}
                              >
                                {s.status === "approved" ? "Earned!" : s.status === "rejected" ? "Rejected" : "Pending"}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {!hasPending && (
                        <div className="flex gap-2 mt-3">
                          <Input
                            value={proofUrls[task.key] || ""}
                            onChange={(e) => setProofUrls((prev) => ({ ...prev, [task.key]: e.target.value }))}
                            placeholder="Paste link to your content..."
                            className="rounded-xl text-sm bg-background"
                          />
                          <Button
                            size="sm"
                            className="rounded-xl flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                            disabled={submittingReward === task.key}
                            onClick={() => handleSubmitReward(task.key)}
                          >
                            {submittingReward === task.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </Button>
                        </div>
                      )}
                      {hasPending && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-2">Awaiting review...</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Payout Request */}
          <Card className="rounded-3xl mb-8">
            <CardHeader>
              <CardTitle className="font-display text-xl flex items-center gap-2">
                <BanknoteIcon className="w-5 h-5" /> Commission Payouts
              </CardTitle>
              <CardDescription>
                Commission becomes available 60 days after the order. Request a payout when your available balance is above £0.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-6 p-4 bg-muted/50 rounded-2xl">
                <div>
                  <p className="text-sm text-muted-foreground">Available to withdraw</p>
                  <p className="text-2xl font-bold font-display">£{availableBalance.toFixed(2)}</p>
                </div>
                <Button
                  className="rounded-2xl"
                  disabled={availableBalance <= 0 || requestingPayout}
                  onClick={handleRequestPayout}
                >
                  {requestingPayout && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Request Payout
                </Button>
              </div>

              {payouts.length > 0 && (
                <div className="overflow-x-auto">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Payout History</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">Amount</th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((p) => (
                        <tr key={p.id} className="border-b border-border/50">
                          <td className="py-3 px-2">{new Date(p.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-2 text-right font-medium">£{Number(p.amount).toFixed(2)}</td>
                          <td className="py-3 px-2 text-right">
                            <Badge variant={payoutStatusColor(p.status) as any}>
                              {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="font-display text-xl">Referred Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-40" />
                  <p className="text-lg font-medium">No orders yet</p>
                  <p className="text-sm">Share your discount code to start earning commission!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Order</th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">Order Total</th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">Commission</th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">Eligible</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const eligible = order.payout_eligible_at && new Date(order.payout_eligible_at) <= now;
                        return (
                          <tr key={order.id} className="border-b border-border/50">
                            <td className="py-3 px-2 font-medium">{order.shopify_order_number || "—"}</td>
                            <td className="py-3 px-2 text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-2 text-right">£{Number(order.order_total).toFixed(2)}</td>
                            <td className="py-3 px-2 text-right font-medium text-primary">
                              £{Number(order.commission).toFixed(2)}
                            </td>
                            <td className="py-3 px-2 text-right">
                              {eligible ? (
                                <Badge variant="default">Available</Badge>
                              ) : (
                                <Badge variant="secondary">
                                  {order.payout_eligible_at
                                    ? new Date(order.payout_eligible_at).toLocaleDateString()
                                    : "Pending"}
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sign Out */}
          <div className="mt-8 text-center">
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={async () => {
                await supabase.auth.signOut();
                setUser(null);
                setAffiliate(null);
                setOrders([]);
                setPayouts([]);
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Affiliates;
