import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Package, CheckCircle2, Truck, Printer, FileText, Pencil, Download, Trash2, RefreshCw, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
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
  builder_session_id: string | null;
  digital_download: boolean;
  digital_pdf_path: string | null;
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

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "In Progress" },
  { value: "active", label: "Active" },
  { value: "shipped", label: "Completed" },
];

const MyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, status, title_page_text, created_at, tracking_number, shipped_at, extra_pages, builder_session_id, digital_download, digital_pdf_path")
      .order("created_at", { ascending: false });
    if (data) setOrders(data as OrderRow[]);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setAuthed(true);
      await fetchOrders();
      setLoading(false);
    };
    init();
  }, [navigate]);

  // Group draft orders by session so multi-book drafts appear as one entry
  const groupedOrders = (() => {
    const sessionSeen = new Set<string>();
    return orders.filter((o) => {
      if (o.status === "draft" && o.builder_session_id) {
        if (sessionSeen.has(o.builder_session_id)) return false;
        sessionSeen.add(o.builder_session_id);
      }
      return true;
    });
  })();

  const filteredOrders = groupedOrders.filter((o) => {
    if (activeTab === "all") return true;
    if (activeTab === "draft") return o.status === "draft";
    if (activeTab === "active") return ["paid", "converted", "sent_to_print"].includes(o.status);
    if (activeTab === "shipped") return o.status === "shipped";
    return true;
  });

  // Count books in a session for display
  const sessionBookCount = (sessionId: string | null) => {
    if (!sessionId) return 1;
    return orders.filter((o) => o.builder_session_id === sessionId).length;
  };

  const handleDeleteOrder = async (orderId: string, sessionId?: string | null) => {
    setDeleting(orderId);
    try {
      // If it's a draft with a session, delete all books in the session
      const idsToDelete = sessionId
        ? orders.filter((o) => o.builder_session_id === sessionId).map((o) => o.id)
        : [orderId];

      for (const id of idsToDelete) {
        await supabase.from("order_photos").delete().eq("order_id", id);
        await supabase.from("orders").delete().eq("id", id);
      }
      setOrders((prev) => prev.filter((o) => !idsToDelete.includes(o.id)));
      toast.success("Order removed");
    } catch {
      toast.error("Failed to remove order");
    } finally {
      setDeleting(null);
    }
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    try {
      const ids = filteredOrders.map((o) => o.id);
      for (const id of ids) {
        await supabase.from("order_photos").delete().eq("order_id", id);
        await supabase.from("orders").delete().eq("id", id);
      }
      setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
      toast.success(`Cleared ${ids.length} order(s)`);
    } catch {
      toast.error("Failed to clear orders");
    } finally {
      setClearingAll(false);
    }
  };

  const handleRepeatOrder = async (order: OrderRow) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newOrder, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          title_page_text: order.title_page_text,
          extra_pages: order.extra_pages,
          status: "draft",
        })
        .select("id")
        .single();

      if (error || !newOrder) {
        toast.error("Failed to repeat order");
        return;
      }

      toast.success("Order duplicated as a new draft — redirecting to builder");
      navigate("/builder");
    } catch {
      toast.error("Failed to repeat order");
    }
  };

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
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-display text-3xl font-bold text-foreground">My Orders</h1>
            {filteredOrders.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all {activeTab !== "all" ? STATUS_TABS.find(t => t.value === activeTab)?.label?.toLowerCase() : ""} orders?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove {filteredOrders.length} order(s). This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAll} disabled={clearingAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {clearingAll ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <p className="text-muted-foreground mb-6">Track the progress of your coloring books</p>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="w-full grid grid-cols-4 rounded-2xl">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="rounded-xl text-xs sm:text-sm">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {filteredOrders.length === 0 ? (
            <Card className="rounded-3xl">
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {activeTab === "all" ? "No orders yet — go create your first book!" : `No ${STATUS_TABS.find(t => t.value === activeTab)?.label?.toLowerCase()} orders`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {filteredOrders.map((order) => {
                const isDraft = order.status === "draft";
                const isShipped = order.status === "shipped";
                const current = stepIndex(order.status);
                const progress = isDraft ? 0 : ((current + 1) / STEPS.length) * 100;
                const booksInSession = isDraft ? sessionBookCount(order.builder_session_id) : 1;

                return (
                  <Card key={order.id} className={`rounded-3xl overflow-hidden ${isDraft ? "border-dashed border-2" : ""}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {isDraft && <Pencil className="w-4 h-4 text-muted-foreground" />}
                            <h3 className="font-display text-lg font-semibold">
                              {order.title_page_text || "Untitled Book"}
                            </h3>
                            {isDraft && booksInSession > 1 && (
                              <Badge variant="outline" className="text-[10px]">{booksInSession} books</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {isDraft ? "Started" : "Ordered"} {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {order.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </Badge>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                <X className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove this order?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  "{order.title_page_text || "Untitled Book"}" will be permanently deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteOrder(order.id, isDraft ? order.builder_session_id : null)}
                                  disabled={deleting === order.id}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deleting === order.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      {/* Progress tracker for non-draft orders */}
                      {!isDraft && (
                        <>
                          <Progress value={progress} className="h-2 mb-4" />
                          <div className="grid grid-cols-4 gap-1 text-center text-xs mb-4">
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
                        </>
                      )}

                      {order.tracking_number && (
                        <div className="mb-4 p-3 bg-muted rounded-xl text-sm">
                          <span className="font-medium">Tracking: </span>
                          <span className="text-muted-foreground">{order.tracking_number}</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {isDraft && (
                          <Button
                            className="rounded-2xl"
                            onClick={() => {
                              if (order.builder_session_id) {
                                navigate(`/builder?sessionId=${order.builder_session_id}`);
                              } else {
                                navigate("/builder");
                              }
                            }}
                          >
                            Continue Creating
                          </Button>
                        )}

                        {(isShipped || (!isDraft && order.status !== "draft")) && (
                          <Button
                            variant="outline"
                            className="rounded-2xl"
                            onClick={() => handleRepeatOrder(order)}
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Repeat Order
                          </Button>
                        )}

                        {!isDraft && (
                          <div className="ml-auto p-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 flex items-center gap-3">
                            <Download className="w-4 h-4 text-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground">Digital Copy</p>
                              <p className="text-[10px] text-muted-foreground">From $5.99</p>
                            </div>
                            <Button size="sm" className="rounded-xl shrink-0 h-7 text-xs">
                              Buy PDF
                            </Button>
                          </div>
                        )}
                      </div>
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
