import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, CheckCircle2, Truck, Printer, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

interface OrderRow {
  id: string;
  status: string;
  title_page_text: string;
  created_at: string;
  tracking_number: string | null;
  shipped_at: string | null;
  extra_pages: number;
}

const STEPS = [
  { key: "paid", label: "Order Placed", icon: FileText },
  { key: "converted", label: "Converting", icon: CheckCircle2 },
  { key: "sent_to_print", label: "Sent to Print", icon: Printer },
  { key: "shipped", label: "Shipped", icon: Truck },
] as const;

const stepIndex = (status: string) => {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
};

const MyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setAuthed(true);

      const { data } = await supabase
        .from("orders")
        .select("id, status, title_page_text, created_at, tracking_number, shipped_at, extra_pages")
        .neq("status", "draft")
        .order("created_at", { ascending: false });

      if (data) setOrders(data as OrderRow[]);
      setLoading(false);
    };
    init();
  }, [navigate]);

  if (!authed || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">My Orders</h1>
          <p className="text-muted-foreground mb-8">Track the progress of your colouring books</p>

          {orders.length === 0 ? (
            <Card className="rounded-3xl">
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No orders yet — go create your first book!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => {
                const current = stepIndex(order.status);
                const progress = ((current + 1) / STEPS.length) * 100;

                return (
                  <Card key={order.id} className="rounded-3xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-display text-lg font-semibold">
                            {order.title_page_text || "Untitled Book"}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Ordered {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary">{order.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</Badge>
                      </div>

                      {/* Progress bar */}
                      <Progress value={progress} className="h-2 mb-4" />

                      {/* Steps */}
                      <div className="grid grid-cols-4 gap-1 text-center text-xs">
                        {STEPS.map((step, i) => {
                          const Icon = step.icon;
                          const active = i <= current;
                          return (
                            <div key={step.key} className={active ? "text-primary" : "text-muted-foreground"}>
                              <Icon className="w-5 h-5 mx-auto mb-1" />
                              <span>{step.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Tracking */}
                      {order.tracking_number && (
                        <div className="mt-4 p-3 bg-muted rounded-xl text-sm">
                          <span className="font-medium">Tracking: </span>
                          <span className="text-muted-foreground">{order.tracking_number}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyOrders;
