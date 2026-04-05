import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-admin";
import {
  Loader2, Package, Trash2, Edit2, Truck, Download, ChevronDown, X, Save, FileText, Eye, Mail, ShoppingBag, ImagePlus, ArrowUp, ArrowDown, Instagram,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import type { Json } from "@/integrations/supabase/types";

const ORDER_STATUSES = ["draft", "paid", "converted", "sent_to_print", "shipped"] as const;

interface OrderRow {
  id: string;
  status: string;
  title_page_text: string;
  title_page_enabled: boolean;
  dedication_page_text: string | null;
  dedication_page_enabled: boolean;
  created_at: string;
  extra_pages: number;
  unique_photos: boolean;
  tracking_number: string | null;
  shipped_at: string | null;
  user_id: string | null;
  customer_email: string | null;
  shopify_order_number: string | null;
  order_name: string | null;
  line_items: Json | null;
  digital_download: boolean;
  production_pdf_path: string | null;
  payment_status: string;
  cover_image_id: string | null;
  cover_image_id_2: string | null;
}

interface PhotoRow {
  id: string;
  original_path: string;
  converted_path: string | null;
  conversion_status: string;
  page_position: number;
  is_landscape: boolean;
}

const statusLabel = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const statusColor = (status: string) => {
  switch (status) {
    case "paid": return "default";
    case "converted": return "secondary";
    case "sent_to_print": return "default";
    case "shipped": return "default";
    default: return "outline";
  }
};

const formatLineItems = (lineItems: Json | null): string => {
  if (!lineItems || !Array.isArray(lineItems)) return "—";
  return (lineItems as Array<{ title?: string; quantity?: number }>)
    .map((item) => `${item.quantity || 1}x ${item.title || "Item"}`)
    .join(", ");
};

interface PayoutRow {
  id: string;
  affiliate_id: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  notes: string | null;
  affiliate_name?: string;
  affiliate_email?: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Edit dialog
  const [editOrder, setEditOrder] = useState<OrderRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<OrderRow>>({});

  // Delete dialog (single or bulk)
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Photos dialog
  const [photosOrderId, setPhotosOrderId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);

  // PDF generation
  const [pdfGenerating, setPdfGenerating] = useState<string | null>(null);

  // Affiliate payouts
  const [payoutRequests, setPayoutRequests] = useState<PayoutRow[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [showPayouts, setShowPayouts] = useState(false);

  // Detail view dialog
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [detailPhotos, setDetailPhotos] = useState<PhotoRow[]>([]);
  const [detailPhotosLoading, setDetailPhotosLoading] = useState(false);

  // Instagram images management
  interface SiteImage { id: string; section: string; image_path: string; alt_text: string; sort_order: number; created_at: string; }
  const [showInstagram, setShowInstagram] = useState(false);
  const [instagramImages, setInstagramImages] = useState<SiteImage[]>([]);
  const [instagramLoading, setInstagramLoading] = useState(false);
  const [instagramUploading, setInstagramUploading] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isAdmin) navigate("/auth");
  }, [roleLoading, isAdmin, navigate]);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .neq("status", "draft")
      .order("created_at", { ascending: false });
    if (!error && data) setOrders(data as OrderRow[]);
    setLoading(false);
    setSelected(new Set());
  };

  const fetchPayouts = async () => {
    setPayoutsLoading(true);
    try {
      const { data: payoutsData } = await supabase
        .from("affiliate_payouts")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (payoutsData && payoutsData.length > 0) {
        const affiliateIds = [...new Set(payoutsData.map((p: any) => p.affiliate_id))];
        const { data: affiliates } = await supabase
          .from("affiliates")
          .select("id, full_name, email")
          .in("id", affiliateIds);
        
        const affMap = new Map((affiliates || []).map((a: any) => [a.id, a]));
        const enriched = payoutsData.map((p: any) => {
          const aff = affMap.get(p.affiliate_id);
          return {
            ...p,
            affiliate_name: aff?.full_name || "Unknown",
            affiliate_email: aff?.email || "",
          };
        });
        setPayoutRequests(enriched as PayoutRow[]);
      } else {
        setPayoutRequests([]);
      }
    } catch (err) {
      console.error("Error fetching payouts:", err);
    } finally {
      setPayoutsLoading(false);
    }
  };

  const handlePayoutAction = async (payoutId: string, action: "paid" | "rejected") => {
    const updates: Record<string, any> = { status: action };
    if (action === "paid") updates.paid_at = new Date().toISOString();
    
    const { error } = await supabase
      .from("affiliate_payouts")
      .update(updates)
      .eq("id", payoutId);
    
    if (error) {
      toast.error("Failed to update payout");
      return;
    }
    toast.success(`Payout marked as ${action}`);
    fetchPayouts();
  };

  // ── Instagram image management ──
  const fetchInstagramImages = async () => {
    setInstagramLoading(true);
    const { data, error } = await supabase
      .from("site_images")
      .select("*")
      .eq("section", "instagram")
      .order("sort_order");
    if (!error && data) setInstagramImages(data as SiteImage[]);
    setInstagramLoading(false);
  };

  const handleInstagramUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setInstagramUploading(true);
    const maxSort = instagramImages.length > 0 ? Math.max(...instagramImages.map(i => i.sort_order)) : -1;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop() || "jpg";
      const storagePath = `site-images/instagram/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("order-files")
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadErr) {
        toast.error(`Upload failed: ${file.name}`);
        continue;
      }

      await supabase.from("site_images").insert({
        section: "instagram",
        image_path: storagePath,
        alt_text: "Piccoload coloring book",
        sort_order: maxSort + 1 + i,
      });
    }

    toast.success("Photos uploaded");
    e.target.value = "";
    fetchInstagramImages();
    setInstagramUploading(false);
  };

  const deleteInstagramImage = async (img: SiteImage) => {
    await supabase.storage.from("order-files").remove([img.image_path]);
    await supabase.from("site_images").delete().eq("id", img.id);
    toast.success("Photo deleted");
    fetchInstagramImages();
  };

  const moveInstagramImage = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= instagramImages.length) return;
    const a = instagramImages[index];
    const b = instagramImages[swapIndex];
    await supabase.from("site_images").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("site_images").update({ sort_order: a.sort_order }).eq("id", b.id);
    fetchInstagramImages();
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchOrders();
  }, [isAdmin]);

  // Fetch photos for an order
  const openPhotos = async (orderId: string) => {
    setPhotosOrderId(orderId);
    setPhotosLoading(true);
    const { data } = await supabase
      .from("order_photos")
      .select("*")
      .eq("order_id", orderId)
      .order("page_position");
    setPhotos((data as PhotoRow[]) || []);
    setPhotosLoading(false);
  };

  // Open detail view
  const openDetail = async (order: OrderRow) => {
    setDetailOrder(order);
    setDetailPhotosLoading(true);
    const { data } = await supabase
      .from("order_photos")
      .select("*")
      .eq("order_id", order.id)
      .order("page_position");
    setDetailPhotos((data as PhotoRow[]) || []);
    setDetailPhotosLoading(false);
  };

  // Generate and download PDF for an order
  const downloadPdf = async (orderId: string) => {
    setPdfGenerating(orderId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ orderId }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to generate PDF");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `order-${orderId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Failed to generate PDF");
    } finally {
      setPdfGenerating(null);
    }
  };

  // Download production PDF from storage
  const downloadProductionPdf = async (order: OrderRow) => {
    if (!order.production_pdf_path) return;
    const { data, error } = await supabase.storage
      .from("order-files")
      .createSignedUrl(order.production_pdf_path, 3600);
    if (error || !data?.signedUrl) {
      toast.error("Could not generate download link");
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = `production-${order.order_name || order.id.slice(0, 8)}.pdf`;
    a.target = "_blank";
    a.click();
  };

  // Download a file from storage
  const downloadFile = async (path: string, filename: string) => {
    const { data, error } = await supabase.storage
      .from("order-files")
      .createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      toast.error("Could not generate download link");
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = filename;
    a.target = "_blank";
    a.click();
  };

  // Update order
  const saveEdit = async () => {
    if (!editOrder) return;
    const updates: Record<string, any> = {};
    if (editForm.status) updates.status = editForm.status;
    if (editForm.title_page_text !== undefined) updates.title_page_text = editForm.title_page_text;
    if (editForm.dedication_page_text !== undefined) updates.dedication_page_text = editForm.dedication_page_text;
    if (editForm.tracking_number !== undefined) updates.tracking_number = editForm.tracking_number || null;
    if (editForm.status === "shipped" && !editOrder.shipped_at) updates.shipped_at = new Date().toISOString();

    const { error } = await supabase.from("orders").update(updates).eq("id", editOrder.id);
    if (error) {
      toast.error("Failed to update order");
      return;
    }
    toast.success("Order updated");
    setEditOrder(null);
    fetchOrders();
  };

  // Delete order
  const confirmDelete = async () => {
    if (!deleteId) return;
    await supabase.from("order_photos").delete().eq("order_id", deleteId);
    const { error } = await supabase.from("orders").delete().eq("id", deleteId);
    if (error) {
      toast.error("Failed to delete order");
    } else {
      toast.success("Order deleted");
      fetchOrders();
    }
    setDeleteId(null);
  };

  // Bulk delete
  const confirmBulkDelete = async () => {
    const ids = Array.from(selected);
    let failed = 0;
    for (const id of ids) {
      await supabase.from("order_photos").delete().eq("order_id", id);
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) failed++;
    }
    if (failed > 0) toast.error(`Failed to delete ${failed} order(s)`);
    else toast.success(`Deleted ${ids.length} order(s)`);
    setBulkDeleteOpen(false);
    fetchOrders();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === orders.length) setSelected(new Set());
    else setSelected(new Set(orders.map((o) => o.id)));
  };

  if (roleLoading || (!isAdmin && !roleLoading)) {
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
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage all orders and uploads</p>
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete {selected.size} selected
                </Button>
              )}
              <Badge variant="outline" className="text-sm py-1 px-3">
                {orders.length} orders
              </Badge>
            </div>
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
            <div className="overflow-x-auto rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={orders.length > 0 && selected.size === orders.length}
                        onChange={toggleSelectAll}
                        className="rounded border-border"
                      />
                    </TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Line Items</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} data-state={selected.has(order.id) ? "selected" : undefined}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected.has(order.id)}
                          onChange={() => toggleSelect(order.id)}
                          className="rounded border-border"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.order_name || order.title_page_text || "Untitled Book"}
                        <span className="block text-xs text-muted-foreground">{order.id.slice(0, 8)}…</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.customer_email ? (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            {order.customer_email}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColor(order.status) as any}>
                          {statusLabel(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {formatLineItems(order.line_items)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.tracking_number || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {order.digital_download && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Digital</Badge>
                          )}
                          {order.unique_photos && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Unique</Badge>
                          )}
                          {order.extra_pages > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{order.extra_pages}pg</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDetail(order)}
                          title="View order details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {order.production_pdf_path && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadProductionPdf(order)}
                            title="Download production PDF"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadPdf(order.id)}
                          title="Generate & download PDF"
                          disabled={pdfGenerating === order.id}
                        >
                          {pdfGenerating === order.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <FileText className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openPhotos(order.id)}
                          title="View individual photos"
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditOrder(order);
                            setEditForm({
                              status: order.status,
                              title_page_text: order.title_page_text,
                              dedication_page_text: order.dedication_page_text,
                              tracking_number: order.tracking_number,
                            });
                          }}
                          title="Edit order"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(order.id)}
                          title="Delete order"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Affiliate Payouts Section */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold text-foreground">Affiliate Payouts</h2>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setShowPayouts(!showPayouts);
                  if (!showPayouts && payoutRequests.length === 0) fetchPayouts();
                }}
              >
                {showPayouts ? "Hide Payouts" : "View Payouts"}
              </Button>
            </div>
            {showPayouts && (
              payoutsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : payoutRequests.length === 0 ? (
                <Card className="rounded-2xl">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No payout requests yet
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-x-auto rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Affiliate</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payoutRequests.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <span className="font-medium">{p.affiliate_name}</span>
                            <span className="block text-xs text-muted-foreground">{p.affiliate_email}</span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(p.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            £{Number(p.amount).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.status === "paid" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                              {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            {p.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-lg text-xs"
                                  onClick={() => handlePayoutAction(p.id, "paid")}
                                >
                                  Mark Paid
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="rounded-lg text-xs text-destructive"
                                  onClick={() => handlePayoutAction(p.id, "rejected")}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {p.paid_at && (
                              <span className="text-xs text-muted-foreground">
                                Paid {new Date(p.paid_at).toLocaleDateString()}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            )}
          </div>

          {/* Instagram Photos Section */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
                <Instagram className="w-6 h-6" />
                Instagram Photos
              </h2>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setShowInstagram(!showInstagram);
                  if (!showInstagram && instagramImages.length === 0) fetchInstagramImages();
                }}
              >
                {showInstagram ? "Hide" : "Manage Photos"}
              </Button>
            </div>
            {showInstagram && (
              instagramLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleInstagramUpload}
                        disabled={instagramUploading}
                      />
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-input bg-background hover:bg-muted transition-colors text-sm font-medium">
                        {instagramUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                        {instagramUploading ? "Uploading…" : "Upload Photos"}
                      </div>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {instagramImages.length} photo{instagramImages.length !== 1 ? "s" : ""} — 6 shown on site
                    </p>
                  </div>

                  {instagramImages.length === 0 ? (
                    <Card className="rounded-2xl">
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No Instagram photos yet. Upload some to display on the landing page.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {instagramImages.map((img, idx) => {
                        const { data: urlData } = supabase.storage.from("order-files").getPublicUrl(img.image_path);
                        return (
                          <div key={img.id} className="relative group rounded-xl overflow-hidden border border-border">
                            <div className="aspect-square">
                              <img
                                src={urlData.publicUrl}
                                alt={img.alt_text}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                                onClick={() => moveInstagramImage(idx, "up")}
                                disabled={idx === 0}
                              >
                                <ArrowUp className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                                onClick={() => moveInstagramImage(idx, "down")}
                                disabled={idx === instagramImages.length - 1}
                              >
                                <ArrowDown className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/20"
                                onClick={() => deleteInstagramImage(img)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                              {idx + 1}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </main>
      <Footer />

      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(o) => !o && setDetailOrder(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details — {detailOrder?.order_name || detailOrder?.id.slice(0, 8)}</DialogTitle>
            <DialogDescription>Full order information and downloads</DialogDescription>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-6">
              {/* Customer & Order Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-medium mb-1">Customer Email</p>
                  <p className="font-medium">{detailOrder.customer_email || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-medium mb-1">Shopify Order</p>
                  <p className="font-medium">{detailOrder.order_name || detailOrder.shopify_order_number || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-medium mb-1">Status</p>
                  <Badge variant={statusColor(detailOrder.status) as any}>
                    {statusLabel(detailOrder.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-medium mb-1">Payment</p>
                  <p className="font-medium">{statusLabel(detailOrder.payment_status)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-medium mb-1">Created</p>
                  <p>{new Date(detailOrder.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-medium mb-1">Tracking</p>
                  <p>{detailOrder.tracking_number || "—"}</p>
                </div>
                {detailOrder.shipped_at && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase font-medium mb-1">Shipped</p>
                    <p>{new Date(detailOrder.shipped_at).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-medium mb-1">Order ID</p>
                  <p className="text-xs font-mono">{detailOrder.id}</p>
                </div>
              </div>

              {/* Book Details */}
              <div>
                <p className="text-muted-foreground text-xs uppercase font-medium mb-2">Book Details</p>
                <div className="rounded-xl border p-3 space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Title:</span> {detailOrder.title_page_text}</p>
                  {detailOrder.dedication_page_enabled && (
                    <p><span className="text-muted-foreground">Dedication:</span> {detailOrder.dedication_page_text || "—"}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    {detailOrder.digital_download && <Badge variant="secondary">Digital Download</Badge>}
                    {detailOrder.unique_photos && <Badge variant="secondary">Unique Photos</Badge>}
                    {detailOrder.extra_pages > 0 && <Badge variant="outline">+{detailOrder.extra_pages} Extra Pages</Badge>}
                  </div>
                </div>
              </div>

              {/* Line Items */}
              {detailOrder.line_items && Array.isArray(detailOrder.line_items) && (detailOrder.line_items as any[]).length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-medium mb-2">Line Items</p>
                  <div className="rounded-xl border divide-y">
                    {(detailOrder.line_items as Array<{ title?: string; quantity?: number; price?: string }>).map((item, i) => (
                      <div key={i} className="p-3 flex justify-between text-sm">
                        <span>{item.quantity || 1}x {item.title || "Item"}</span>
                        {item.price && <span className="text-muted-foreground">£{item.price}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PDF Downloads */}
              <div>
                <p className="text-muted-foreground text-xs uppercase font-medium mb-2">PDF Downloads</p>
                <div className="flex flex-wrap gap-2">
                  {detailOrder.production_pdf_path && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => downloadProductionPdf(detailOrder)}
                    >
                      <Download className="w-4 h-4 mr-1" /> Production PDF
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => downloadPdf(detailOrder.id)}
                    disabled={pdfGenerating === detailOrder.id}
                  >
                    {pdfGenerating === detailOrder.id
                      ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      : <FileText className="w-4 h-4 mr-1" />}
                    Generate PDF
                  </Button>
                </div>
              </div>

              {/* Photos */}
              <div>
                <p className="text-muted-foreground text-xs uppercase font-medium mb-2">
                  Photos ({detailPhotos.length})
                </p>
                {detailPhotosLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : detailPhotos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No photos uploaded</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {detailPhotos.map((p) => (
                      <div key={p.id} className="flex items-center justify-between border rounded-xl p-3">
                        <div className="text-sm">
                          <p className="font-medium">Page {p.page_position + 1}</p>
                          <p className="text-muted-foreground text-xs">
                            {statusLabel(p.conversion_status)} {p.is_landscape && "· Landscape"}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg text-xs"
                            onClick={() => downloadFile(p.original_path, `page-${p.page_position + 1}-original`)}
                          >
                            Original
                          </Button>
                          {p.converted_path && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-lg text-xs"
                              onClick={() => downloadFile(p.converted_path!, `page-${p.page_position + 1}-lineart`)}
                            >
                              Line Art
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={!!editOrder} onOpenChange={(o) => !o && setEditOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
            <DialogDescription>Update status, tracking, and details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editForm.status || ""}
                onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tracking Number</Label>
              <Input
                className="rounded-xl"
                placeholder="e.g. RM123456789GB"
                value={editForm.tracking_number || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, tracking_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Title Page Text</Label>
              <Input
                className="rounded-xl"
                value={editForm.title_page_text || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, title_page_text: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Dedication Text</Label>
              <Input
                className="rounded-xl"
                value={editForm.dedication_page_text || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, dedication_page_text: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOrder(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={saveEdit} className="rounded-xl">
              <Save className="w-4 h-4 mr-1" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the order and all associated photos. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={(o) => !o && setBulkDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} Order{selected.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected orders and all associated photos. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete {selected.size} Order{selected.size !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Photos / Downloads Dialog */}
      <Dialog open={!!photosOrderId} onOpenChange={(o) => !o && setPhotosOrderId(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Files</DialogTitle>
            <DialogDescription>Download originals and converted line art</DialogDescription>
          </DialogHeader>
          {photosLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : photos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No photos uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {photos.map((p) => (
                <div key={p.id} className="flex items-center justify-between border rounded-xl p-3">
                  <div className="text-sm">
                    <p className="font-medium">Page {p.page_position + 1}</p>
                    <p className="text-muted-foreground text-xs">
                      {p.conversion_status} {p.is_landscape && "· Landscape"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-xs"
                      onClick={() => downloadFile(p.original_path, `page-${p.page_position + 1}-original`)}
                    >
                      Original
                    </Button>
                    {p.converted_path && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg text-xs"
                        onClick={() => downloadFile(p.converted_path!, `page-${p.page_position + 1}-converted`)}
                      >
                        Line Art
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
