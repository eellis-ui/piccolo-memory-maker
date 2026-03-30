import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, User, Mail, Calendar, ChevronRight, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";

interface OrderSummary {
  total: number;
  active: number;
  shipped: number;
  drafts: number;
}

const Account = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [orderSummary, setOrderSummary] = useState<OrderSummary>({ total: 0, active: 0, shipped: 0, drafts: 0 });
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { state: { from: "/account" }, replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    setSummaryLoading(true);
    supabase
      .from("orders")
      .select("id, status")
      .then(({ data }) => {
        if (data) {
          setOrderSummary({
            total: data.length,
            active: data.filter((o) => ["paid", "converted", "sent_to_print"].includes(o.status)).length,
            shipped: data.filter((o) => o.status === "shipped").length,
            drafts: data.filter((o) => o.status === "draft").length,
          });
        }
        setSummaryLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : "Unknown";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">My Account</h1>
          <p className="text-muted-foreground mb-8">Manage your account and view your orders</p>

          {/* Account Info */}
          <Card className="rounded-3xl mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{user.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Member since {memberSince}</span>
              </div>
            </CardContent>
          </Card>

          {/* Orders Summary */}
          <Card className="rounded-3xl mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Orders Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-muted rounded-xl">
                      <p className="text-2xl font-bold text-foreground">{orderSummary.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-xl">
                      <p className="text-2xl font-bold text-foreground">{orderSummary.active}</p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-xl">
                      <p className="text-2xl font-bold text-foreground">{orderSummary.shipped}</p>
                      <p className="text-xs text-muted-foreground">Shipped</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-xl">
                      <p className="text-2xl font-bold text-foreground">{orderSummary.drafts}</p>
                      <p className="text-xs text-muted-foreground">Drafts</p>
                    </div>
                  </div>
                  <Link to="/my-orders">
                    <Button variant="outline" className="w-full rounded-2xl justify-between">
                      View All Orders
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="rounded-3xl mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/builder">
                <Button variant="outline" className="w-full rounded-2xl justify-between">
                  Create a New Book
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/my-orders">
                <Button variant="outline" className="w-full rounded-2xl justify-between">
                  Track My Orders
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Button
            variant="ghost"
            className="w-full rounded-2xl text-destructive hover:bg-destructive/10"
            onClick={async () => {
              await supabase.auth.signOut({ scope: "local" });
              navigate("/");
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Account;
