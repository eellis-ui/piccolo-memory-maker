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
import { useAuth } from "@/contexts/AuthContext";
import { createShopifyCheckout, SHOPIFY_VARIANTS } from "@/lib/shopify";
import { DIGITAL_DOWNLOAD_PRICE } from "@/contexts/BasketContext";
import { ShoppingCart } from "lucide-react";

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
  production_pdf_path: string | null;
  shopify_order_number: string | null;
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
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<Set<string>>(new Set());

  // Redirect to auth if not logged in once loading resolves
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { state: { from: "/my-orders" }, replace: true });
    }
  }, [user, loading, navigate]);

  // Fetch orders once user is known
  useEffect(() => {
    if (!user) return;
    setOrdersLoading(true);
    supabase
      .from("orders")
      .select("id, status, title_page_text, created_at, tracking_number, shipped_at, extra_pages, builder_session_id, digital_download, digital_pdf_path, production_pdf_path, shopify_order_number")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setOrders(data as OrderRow[]);
        setOrdersLoading(false);
      })
      .catch(() => setOrdersLoading(false));
  }, [user]);

  // Auto-trigger PDF generation for paid orders missing production PDF
  useEffect(() => {
    if (!user || orders.length === 0) return;

    const pendingOrders = orders.filter(
      (o) => !o.production_pdf_path && o.status !== "draft" && !generatingPdf.has(o.id)
    );

    if (pendingOrders.length === 0) return;

    for (const order of pendingOrders) {
      setGeneratingPdf((prev) => new Set(prev).add(order.id));

      supabase.functions
        .invoke("generate-customer-pdf", { body: { orderId: order.id } })
        .then(({ data, error }) => {
          if (error) {
            console.error("PDF generation failed for", order.id, error);
            return;
          }
          if (data?.pdfPath) {
            setOrders((prev) =>
              prev.map((o) => (o.id === order.id ? { ...o, production_pdf_path: data.pdfPath, ...(o.digital_download ? { digital_pdf_path: data.pdfPath } : {}) } : o))
            );
          }
        })
        .finally(() => {
          setGeneratingPdf((prev) => {
            const next = new Set(prev);
            next.delete(order.id);
            return next;
          });
        });
    }
  }, [orders, user]);

  // Group orders by session so multi-book orders appear as one entry
  interface OrderGroup {
    key: string;
    primary: OrderRow;
    books: OrderRow[];
  }

  const orderGroups: OrderGroup[] = (() => {
    const sessionMap = new Map<string, OrderRow[]>();
    const standalone: OrderRow[] = [];

    for (const o of orders) {
      if (o.builder_session_id) {
        const list = sessionMap.get(o.builder_session_id) || [];
        list.push(o);
        sessionMap.set(o.builder_session_id, list);
      } else {
        standalone.push(o);
      }
    }

    const groups: OrderGroup[] = [];
    for (const [sessionId, books] of sessionMap) {
      groups.push({ key: sessionId, primary: books[0], books });
    }
    for (const o of standalone) {
      groups.push({ key: o.id, primary: o, books: [o] });
    }

    // Sort by most recent first
    groups.sort((a, b) => new Date(b.primary.created_at).getTime() - new Date(a.primary.created_at).getTime());
    return groups;
  })();

  const filteredGroups = orderGroups.filter((g) => {
    const status = g.primary.status;
    if (activeTab === "all") return true;
    if (activeTab === "draft") return status === "draft";
    if (activeTab === "active") return ["paid", "converted", "sent_to_print"].includes(status);
    if (activeTab === "shipped") return status === "shipped";
    return true;
  });

  const handleDeleteGroup = async (group: OrderGroup) => {
    setDeleting(group.key);
    try {
      const idsToDelete = group.books.map((o) => o.id);
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
      const ids = filteredGroups.flatMap((g) => g.books.map((o) => o.id));
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
    if (!user) return;
    try {
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

  if (loading || ordersLoading) {
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
            {filteredGroups.length > 0 && (
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
                      This will permanently remove {filteredGroups.length} order(s). This action cannot be undone.
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
            <TabsList className="w-full grid grid-cols-4 rounded-lg bg-foreground p-1">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-md text-xs sm:text-sm font-semibold text-background data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-background/70"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {filteredGroups.length === 0 ? (
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
              {filteredGroups.map((group) => {
                const order = group.primary;
                const isDraft = order.status === "draft";
                const isShipped = order.status === "shipped";
                const current = stepIndex(order.status);
                const progress = isDraft ? 0 : ((current + 1) / STEPS.length) * 100;
                const bookCount = group.books.length;

                return (
                  <Card key={group.key} className={`rounded-3xl overflow-hidden ${isDraft ? "border-dashed border-2" : ""}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {isDraft && <Pencil className="w-4 h-4 text-muted-foreground" />}
                            <h3 className="font-display text-lg font-semibold">
                              {order.title_page_text || "Untitled Book"}
                            </h3>
                            {bookCount > 1 && (
                              <Badge variant="outline" className="text-[10px]">{bookCount} books</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {order.shopify_order_number && <span className="font-medium text-foreground">{order.shopify_order_number} &middot; </span>}
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
                                  onClick={() => handleDeleteGroup(group)}
                                  disabled={deleting === group.key}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deleting === group.key ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

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

                      {/* Draft actions */}
                      {isDraft && (
                        <div className="flex items-center gap-2 flex-wrap">
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
                        </div>
                      )}

                      {/* Paid order actions */}
                      {!isDraft && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              className="rounded-2xl"
                              onClick={() => handleRepeatOrder(order)}
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Repeat Order
                            </Button>
                          </div>

                          {/* Per-book PDF section */}
                          <div className="space-y-2 border-t border-border pt-3">
                            {group.books.map((book, bookIdx) => {
                              const pdfPath = book.digital_download ? (book.digital_pdf_path || book.production_pdf_path) : book.production_pdf_path;
                              const hasPdf = !!pdfPath;
                              const isPurchased = book.digital_download;
                              const isGenerating = !hasPdf && generatingPdf.has(book.id);

                              return (
                                <div
                                  key={book.id}
                                  className={`flex items-center justify-between gap-3 py-3 px-4 rounded-xl ${
                                    isPurchased && hasPdf
                                      ? "bg-primary/5 border border-primary/20"
                                      : "bg-muted/50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                      isPurchased && hasPdf
                                        ? "bg-primary/15"
                                        : "bg-muted"
                                    }`}>
                                      <FileText className={`w-4 h-4 ${
                                        isPurchased && hasPdf ? "text-primary" : "text-muted-foreground"
                                      }`} />
                                    </div>
                                    <div>
                                      <span className="text-sm font-semibold text-foreground">
                                        {bookCount > 1 ? `Book ${bookIdx + 1}` : "Digital PDF"}
                                      </span>
                                      <p className="text-[11px] text-muted-foreground">
                                        {isPurchased && hasPdf
                                          ? "Ready to download"
                                          : isPurchased
                                            ? "Generating your PDF…"
                                            : "Printable colouring book PDF"}
                                      </p>
                                    </div>
                                  </div>

                                  {isPurchased && hasPdf ? (
                                    <Button
                                      size="sm"
                                      className="rounded-xl text-xs"
                                      onClick={async () => {
                                        const { data } = await supabase.storage
                                          .from("order-files")
                                          .createSignedUrl(pdfPath!, 60 * 60);
                                        if (data?.signedUrl) {
                                          const a = document.createElement("a");
                                          a.href = data.signedUrl;
                                          a.download = "";
                                          a.target = "_blank";
                                          a.rel = "noopener";
                                          a.click();
                                        } else {
                                          toast.error("Could not generate download link");
                                        }
                                      }}
                                    >
                                      <Download className="w-3.5 h-3.5 mr-1" />
                                      Download
                                    </Button>
                                  ) : isGenerating || (isPurchased && !hasPdf) ? (
                                    <div className="flex items-center gap-2">
                                      <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                                      <span className="text-[11px] text-muted-foreground font-medium">Generating…</span>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="rounded-xl text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                                      onClick={async () => {
                                        try {
                                          const checkoutUrl = await createShopifyCheckout(
                                            [{
                                              merchandiseId: SHOPIFY_VARIANTS.DIGITAL_DOWNLOAD,
                                              quantity: 1,
                                              attributes: [{ key: "order_id", value: book.id }],
                                            }],
                                            order.builder_session_id || undefined,
                                          );
                                          if (checkoutUrl) window.open(checkoutUrl, "_blank");
                                        } catch {
                                          toast.error("Could not create checkout");
                                        }
                                      }}
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      ${DIGITAL_DOWNLOAD_PRICE.toFixed(2)}
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
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
