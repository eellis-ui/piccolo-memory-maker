import { useState, useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, DollarSign, ShoppingBag, TrendingUp, Copy, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

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
  created_at: string;
}

interface AffiliateOrder {
  id: string;
  shopify_order_number: string | null;
  order_total: number;
  commission: number;
  created_at: string;
}

const Affiliates = () => {
  
  const [user, setUser] = useState<any>(null);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [orders, setOrders] = useState<AffiliateOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAffiliateData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAffiliateData(session.user.id);
      } else {
        setAffiliate(null);
        setOrders([]);
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
        // Fetch affiliate orders
        const { data: affOrders } = await supabase
          .from("affiliate_orders")
          .select("*")
          .eq("affiliate_id", aff.id)
          .order("created_at", { ascending: false });
        setOrders((affOrders as AffiliateOrder[]) || []);
      }
    } catch (err) {
      console.error("Error fetching affiliate data:", err);
    } finally {
      setLoading(false);
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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

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
            instagram_handle: instagramHandle || null,
            tiktok_handle: tiktokHandle || null,
          }),
        },
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to sign up");

      toast.success("Welcome to the affiliate program! 🎉");
      fetchAffiliateData(user.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
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
                <p className="text-sm opacity-70 mt-1">Customers save 10% · You earn 10% commission</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-3xl font-bold font-display">£{Number(affiliate.total_commission).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Commission Earned</p>
              </CardContent>
            </Card>
          </div>

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
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b border-border/50">
                          <td className="py-3 px-2 font-medium">{order.shopify_order_number || "—"}</td>
                          <td className="py-3 px-2 text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-2 text-right">£{Number(order.order_total).toFixed(2)}</td>
                          <td className="py-3 px-2 text-right font-medium text-primary">
                            £{Number(order.commission).toFixed(2)}
                          </td>
                        </tr>
                      ))}
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
