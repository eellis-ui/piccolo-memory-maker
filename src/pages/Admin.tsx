import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-admin";
import { Loader2, Package, Image, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

interface OrderRow {
  id: string;
  status: string;
  title_page_text: string;
  dedication_page_text: string | null;
  created_at: string;
  extra_pages: number;
  unique_photos: boolean;
}

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/auth");
    }
  }, [roleLoading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrders(data as OrderRow[]);
      }
      setLoading(false);
    };

    fetchOrders();
  }, [isAdmin]);

  if (roleLoading || (!isAdmin && !roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "paid": return "default";
      case "draft": return "secondary";
      case "ready": return "default";
      case "shipped": return "default";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage all orders and uploads</p>
            </div>
            <Badge variant="outline" className="text-sm py-1 px-3">
              {orders.length} orders
            </Badge>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <Card className="rounded-3xl">
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No orders yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="rounded-3xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="font-display text-base">
                        {order.title_page_text || "Untitled Book"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleDateString()} · {order.id.slice(0, 8)}…
                      </p>
                    </div>
                    <Badge variant={statusColor(order.status) as any}>
                      {order.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      {order.extra_pages > 0 && <span>+{order.extra_pages} extra pages · </span>}
                      {order.unique_photos && <span>Unique photos · </span>}
                      {order.dedication_page_text && (
                        <span className="italic">"{order.dedication_page_text}"</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
