import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-admin";
import { useLiveDashboard } from "@/hooks/use-live-visitors";
import {
  Loader2, Package, Trash2, Edit2, Truck, Download, ChevronDown, ChevronRight, X, Save, FileText, Eye, Mail, ShoppingBag, ImagePlus, ArrowUp, ArrowDown, Instagram, Star, ExternalLink, Search, Users, ShoppingCart, CreditCard, CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import type { Json } from "@/integrations/supabase/types";

/* ─── Constants & helpers ─── */
const ORDER_STATUSES = ["draft", "paid", "converted", "sent_to_print", "shipped"] as const;
type FilterTab = "all" | "unfulfilled" | "shipped";

// Older orders may have multiple rows per (order_id, page_position) due to
// re-uploads that didn't clear stale rows. Collapse to one live row per page,
// preferring approved+completed > completed > most recent.
function dedupePhotosByPage<T extends { page_position: number; is_approved?: boolean | null; conversion_status?: string | null; created_at?: string | null }>(rows: T[]): T[] {
  const score = (r: T) =>
    (r.is_approved && r.conversion_status === "completed" ? 3 : 0) +
    (r.conversion_status === "completed" ? 1 : 0);
  const byPage = new Map<number, T>();
  for (const r of rows) {
    const existing = byPage.get(r.page_position);
    if (!existing) { byPage.set(r.page_position, r); continue; }
    const sNew = score(r);
    const sOld = score(existing);
    if (sNew > sOld) { byPage.set(r.page_position, r); continue; }
    if (sNew === sOld) {
      const tNew = r.created_at ? Date.parse(r.created_at) : 0;
      const tOld = existing.created_at ? Date.parse(existing.created_at) : 0;
      if (tNew > tOld) byPage.set(r.page_position, r);
    }
  }
  return Array.from(byPage.values()).sort((a, b) => a.page_position - b.page_position);
}

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
  customer_name: string | null;
  shopify_order_number: string | null;
  order_name: string | null;
  line_items: Json | null;
  digital_download: boolean;
  digital_pdf_path: string | null;
  production_pdf_path: string | null;
  payment_status: string;
  cover_image_id: string | null;
  cover_image_id_2: string | null;
  builder_session_id: string | null;
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
  if (!lineItems || !Array.isArray(lineItems)) return "\u2014";
  return (lineItems as Array<{ title?: string; quantity?: number }>)
    .map((item) => `${item.quantity || 1}x ${item.title || "Item"}`)
    .join(", ");
};

const getShopifyFulfillUrl = (order: OrderRow) => {
  if (order.shopify_order_number) {
    return `https://admin.shopify.com/store/piccaload/orders?query=${encodeURIComponent(order.shopify_order_number)}`;
  }
  if (order.order_name) {
    return `https://admin.shopify.com/store/piccaload/orders?query=${encodeURIComponent(order.order_name)}`;
  }
  return null;
};

/* ─── Secondary section types ─── */
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

interface RewardRow {
  id: string;
  affiliate_id: string;
  task_key: string;
  proof_url: string;
  points: number;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  affiliate_name?: string;
  affiliate_email?: string;
}

interface SiteImage {
  id: string;
  section: string;
  image_path: string;
  alt_text: string;
  sort_order: number;
  created_at: string;
}

/* ═══════════════════════════════════════════
   Admin Component
   ═══════════════════════════════════════════ */
const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const live = useLiveDashboard();

  /* ─── Orders state ─── */
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});

  /* ─── Edit dialog ─── */
  const [editOrder, setEditOrder] = useState<OrderRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<OrderRow>>({});

  /* ─── Delete dialog (single only — no bulk) ─── */
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ─── Photos dialog ─── */
  const [photosOrderId, setPhotosOrderId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);

  /* ─── PDF generation ─── */
  const [pdfGenerating, setPdfGenerating] = useState<string | null>(null);

  /* ─── Detail view dialog ─── */
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [detailPhotos, setDetailPhotos] = useState<PhotoRow[]>([]);
  const [detailPhotosLoading, setDetailPhotosLoading] = useState(false);

  /* ─── Secondary sections (collapsed by default) ─── */
  const [showPayouts, setShowPayouts] = useState(false);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRow[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);

  const [showRewards, setShowRewards] = useState(false);
  const [rewardSubmissions, setRewardSubmissions] = useState<RewardRow[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);

  const [showInstagram, setShowInstagram] = useState(false);
  const [instagramImages, setInstagramImages] = useState<SiteImage[]>([]);
  const [instagramLoading, setInstagramLoading] = useState(false);
  const [instagramUploading, setInstagramUploading] = useState(false);

  /* ─── Computed: book labels for multi-book sessions ─── */
  const bookLabels = useMemo(() => {
    const sessionMap = new Map<string, OrderRow[]>();
    for (const o of orders) {
      if (!o.builder_session_id) continue;
      const arr = sessionMap.get(o.builder_session_id) || [];
      arr.push(o);
      sessionMap.set(o.builder_session_id, arr);
    }
    const labels = new Map<string, { label: string; total: number; index: number; siblings: OrderRow[] }>();
    for (const [, siblings] of sessionMap) {
      if (siblings.length <= 1) continue;
      const sorted = [...siblings].sort((a, b) => a.created_at.localeCompare(b.created_at));
      sorted.forEach((o, i) => {
        labels.set(o.id, { label: `Book ${i + 1}`, total: sorted.length, index: i + 1, siblings: sorted });
      });
    }
    return labels;
  }, [orders]);

  /* ─── Computed: filtered + searched orders ─── */
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Tab filter
    if (filterTab === "unfulfilled") {
      result = result.filter((o) => o.status !== "shipped");
    } else if (filterTab === "shipped") {
      result = result.filter((o) => o.status === "shipped");
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((o) =>
        (o.shopify_order_number && o.shopify_order_number.toLowerCase().includes(q)) ||
        (o.order_name && o.order_name.toLowerCase().includes(q)) ||
        (o.customer_email && o.customer_email.toLowerCase().includes(q)) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
        o.id.toLowerCase().includes(q)
      );
    }

    return result;
  }, [orders, filterTab, searchQuery]);

  /* ─── Computed: tab counts ─── */
  const tabCounts = useMemo(() => ({
    all: orders.length,
    unfulfilled: orders.filter((o) => o.status !== "shipped").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
  }), [orders]);

  /* ─── Auth guard ─── */
  useEffect(() => {
    if (!roleLoading && !isAdmin) navigate("/auth");
  }, [roleLoading, isAdmin, navigate]);

  /* ─── Data fetching ─── */
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .neq("status", "draft")
      .order("created_at", { ascending: false });
    if (!error && data) setOrders(data as OrderRow[]);
    setLoading(false);
  };

  const fetchPhotoCounts = async () => {
    const { data, error } = await supabase
      .from("order_photos")
      .select("order_id, page_position, is_approved, conversion_status, created_at");
    if (!error && data) {
      // Group by order, then dedupe each order's rows so the count reflects unique
      // pages rather than stale upload duplicates.
      const byOrder = new Map<string, typeof data>();
      for (const row of data) {
        const list = byOrder.get(row.order_id) ?? [];
        list.push(row);
        byOrder.set(row.order_id, list);
      }
      const counts: Record<string, number> = {};
      for (const [orderId, rows] of byOrder) {
        counts[orderId] = dedupePhotosByPage(rows).length;
      }
      setPhotoCounts(counts);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchOrders();
    fetchPhotoCounts();
  }, [isAdmin]);

  /* ─── Order actions ─── */
  const openPhotos = async (orderId: string) => {
    setPhotosOrderId(orderId);
    setPhotosLoading(true);
    const { data } = await supabase
      .from("order_photos")
      .select("*")
      .eq("order_id", orderId)
      .order("page_position");
    setPhotos(dedupePhotosByPage((data as PhotoRow[]) || []));
    setPhotosLoading(false);
  };

  const openDetail = async (order: OrderRow) => {
    setDetailOrder(order);
    setDetailPhotosLoading(true);
    const { data } = await supabase
      .from("order_photos")
      .select("*")
      .eq("order_id", order.id)
      .order("page_position");
    setDetailPhotos(dedupePhotosByPage((data as PhotoRow[]) || []));
    setDetailPhotosLoading(false);
  };

  const generateAndDownloadPdf = async (order: OrderRow) => {
    setPdfGenerating(order.id);
    try {
      const bl = bookLabels.get(order.id);
      const bookSuffix = bl ? `-book${bl.index}` : "";
      const orderRef = order.shopify_order_number || order.order_name || order.id.slice(0, 8);
      const filename = `production-${orderRef}${bookSuffix}.pdf`;

      if (order.production_pdf_path) {
        await downloadFromStorage(order.production_pdf_path, filename);
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-customer-pdf", {
        body: { orderId: order.id },
      });

      if (error) {
        toast.error(error.message || "Failed to generate PDF");
        return;
      }

      const pdfPath = data?.pdfPath;
      if (!pdfPath) {
        toast.error("PDF generation returned no path");
        return;
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, production_pdf_path: pdfPath } : o))
      );
      if (detailOrder?.id === order.id) {
        setDetailOrder((prev) => prev ? { ...prev, production_pdf_path: pdfPath } : prev);
      }

      toast.success(`Production PDF generated${bl ? ` (Book ${bl.index})` : ""}`);
      await downloadFromStorage(pdfPath, filename);
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setPdfGenerating(null);
    }
  };

  const downloadFromStorage = async (path: string, filename: string) => {
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

  const downloadFile = async (path: string, filename: string) => {
    await downloadFromStorage(path, filename);
  };

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

  const confirmDelete = async () => {
    if (!deleteId) return;
    const order = orders.find((o) => o.id === deleteId);
    if (order && order.payment_status === "paid") {
      toast.error("Cannot delete paid orders");
      setDeleteId(null);
      return;
    }
    await supabase.from("order_photos").delete().eq("order_id", deleteId);
    const { error } = await supabase.from("orders").delete().eq("id", deleteId);
    if (error) {
      toast.error("Failed to delete order");
    } else {
      toast.success("Order deleted");
      fetchOrders();
      fetchPhotoCounts();
    }
    setDeleteId(null);
  };

  /* ─── Affiliate payouts ─── */
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

  /* ─── Reward submissions ─── */
  const fetchRewardSubmissions = async () => {
    setRewardsLoading(true);
    try {
      const { data } = await supabase
        .from("affiliate_reward_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (data && data.length > 0) {
        const affiliateIds = [...new Set(data.map((r: any) => r.affiliate_id))];
        const { data: affiliates } = await supabase
          .from("affiliates")
          .select("id, full_name, email")
          .in("id", affiliateIds);
        const affMap = new Map((affiliates || []).map((a: any) => [a.id, a]));
        setRewardSubmissions(data.map((r: any) => {
          const aff = affMap.get(r.affiliate_id);
          return { ...r, affiliate_name: aff?.full_name || "Unknown", affiliate_email: aff?.email || "" };
        }));
      } else {
        setRewardSubmissions([]);
      }
    } catch (err) {
      console.error("Error fetching reward submissions:", err);
    } finally {
      setRewardsLoading(false);
    }
  };

  const handleRewardAction = async (submissionId: string, action: "approved" | "rejected", affiliateId: string, points: number) => {
    const updates: Record<string, any> = { status: action, reviewed_at: new Date().toISOString() };
    const { error } = await supabase
      .from("affiliate_reward_submissions")
      .update(updates)
      .eq("id", submissionId);
    if (error) { toast.error("Failed to update submission"); return; }

    if (action === "approved") {
      const { data: aff } = await supabase.from("affiliates").select("total_points, commission_tier").eq("id", affiliateId).single();
      if (aff) {
        const newPoints = (aff.total_points || 0) + points;
        let newTier = aff.commission_tier || 1;
        if (newPoints >= 500) newTier = 3;
        else if (newPoints >= 200) newTier = 2;
        await supabase.from("affiliates").update({ total_points: newPoints, commission_tier: newTier }).eq("id", affiliateId);
      }
    }

    toast.success(`Submission ${action}`);
    fetchRewardSubmissions();
  };

  /* ─── Instagram images ─── */
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

  /* ─── Loading guard ─── */
  if (roleLoading || (!isAdmin && !roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-8">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">

          {/* ─── Live Dashboard ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <div className="rounded-xl border bg-background p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${live.visitorsNow > 0 ? "bg-green-400" : "bg-gray-300"}`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${live.visitorsNow > 0 ? "bg-green-500" : "bg-gray-400"}`} />
                </span>
                Live now
              </div>
              <p className="text-2xl font-bold">{live.loading ? "\u2014" : live.visitorsNow}</p>
            </div>
            <div className="rounded-xl border bg-background p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <Users className="w-3.5 h-3.5" />
                Sessions today
              </div>
              <p className="text-2xl font-bold">{live.loading ? "\u2014" : live.today.sessions}</p>
            </div>
            <div className="rounded-xl border bg-background p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <ShoppingCart className="w-3.5 h-3.5" />
                Add to cart
              </div>
              <p className="text-2xl font-bold">{live.loading ? "\u2014" : live.today.addToCarts}</p>
            </div>
            <div className="rounded-xl border bg-background p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <CreditCard className="w-3.5 h-3.5" />
                Checkouts
              </div>
              <p className="text-2xl font-bold">{live.loading ? "\u2014" : live.today.checkoutsInitiated}</p>
            </div>
            <div className="rounded-xl border bg-background p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Purchases
              </div>
              <p className="text-2xl font-bold">{live.loading ? "\u2014" : live.today.purchases}</p>
              {live.today.sessions > 0 && live.today.purchases > 0 && (
                <p className="text-xs text-green-600 font-medium mt-0.5">
                  {((live.today.purchases / live.today.sessions) * 100).toFixed(1)}% conv.
                </p>
              )}
            </div>
          </div>

          {/* ─── Orders header ─── */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Orders</h2>
              <p className="text-xs text-muted-foreground">{orders.length} total</p>
            </div>
          </div>

          {/* ─── Filter tabs + Search bar ─── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
              {(["all", "unfulfilled", "shipped"] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    filterTab === tab
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "all" ? "All" : tab === "unfulfilled" ? "Unfulfilled" : "Shipped"}
                  <span className={`ml-1.5 text-xs ${filterTab === tab ? "text-foreground" : "text-muted-foreground"}`}>
                    {tabCounts[tab]}
                  </span>
                </button>
              ))}
            </div>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search order #, email, name, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-lg h-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* ─── Orders table ─── */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No orders match your search" : "No orders yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="font-semibold">Order</TableHead>
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-center">Photos</TableHead>
                    <TableHead className="font-semibold">Items</TableHead>
                    <TableHead className="font-semibold">Tracking</TableHead>
                    <TableHead className="font-semibold text-center">Ship</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const shopifyUrl = getShopifyFulfillUrl(order);
                    const isUnfulfilled = order.status !== "shipped";
                    const isPaid = order.payment_status === "paid";
                    const photoCount = photoCounts[order.id] || 0;

                    return (
                      <TableRow
                        key={order.id}
                        className="group hover:bg-muted/30 transition-colors"
                      >
                        {/* Order */}
                        <TableCell>
                          <div className="font-medium text-sm">
                            {order.order_name || order.shopify_order_number || order.title_page_text || "Untitled"}
                            {bookLabels.has(order.id) && (
                              <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0">
                                {bookLabels.get(order.id)!.label} of {bookLabels.get(order.id)!.total}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            {order.id.slice(0, 8)}
                          </span>
                        </TableCell>

                        {/* Customer */}
                        <TableCell className="text-sm">
                          {order.customer_name && (
                            <span className="block font-medium">{order.customer_name}</span>
                          )}
                          {order.customer_email ? (
                            <span className="flex items-center gap-1 text-muted-foreground text-xs">
                              <Mail className="w-3 h-3" />
                              {order.customer_email}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{"\u2014"}</span>
                          )}
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(order.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "2-digit",
                          })}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge variant={statusColor(order.status) as any} className="text-xs">
                            {statusLabel(order.status)}
                          </Badge>
                          {order.digital_download && (
                            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">PDF</Badge>
                          )}
                        </TableCell>

                        {/* Photos */}
                        <TableCell className="text-center">
                          <span className="text-sm text-muted-foreground">{photoCount || "\u2014"}</span>
                        </TableCell>

                        {/* Line Items */}
                        <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                          {formatLineItems(order.line_items)}
                        </TableCell>

                        {/* Tracking */}
                        <TableCell className="text-sm">
                          {order.tracking_number ? (
                            <span className="font-mono text-xs">{order.tracking_number}</span>
                          ) : (
                            <span className="text-muted-foreground">{"\u2014"}</span>
                          )}
                        </TableCell>

                        {/* Ship button */}
                        <TableCell className="text-center">
                          {isUnfulfilled && shopifyUrl ? (
                            <a
                              href={shopifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              Ship
                            </a>
                          ) : order.status === "shipped" ? (
                            <span className="text-xs text-green-600 font-medium flex items-center justify-center gap-1">
                              <Truck className="w-3.5 h-3.5" />
                              Sent
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">{"\u2014"}</span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => openDetail(order)}
                              title="View order details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {/* Download production PDF(s) */}
                            {(() => {
                              const bl = bookLabels.get(order.id);
                              const booksToShow = bl ? bl.siblings : [order];
                              return booksToShow.map((book) => {
                                const bookBl = bookLabels.get(book.id);
                                const label = bookBl ? `Bk${bookBl.index}` : "";
                                return (
                                  <Button
                                    key={book.id}
                                    size="sm"
                                    variant="ghost"
                                    className={`h-8 p-0 ${label ? "w-auto px-1.5 text-xs gap-0.5" : "w-8"}`}
                                    onClick={() => generateAndDownloadPdf(book)}
                                    title={book.production_pdf_path ? `Download ${label || "production PDF"}` : `Generate ${label || "PDF"}`}
                                    disabled={pdfGenerating === book.id}
                                  >
                                    {pdfGenerating === book.id
                                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      : book.production_pdf_path
                                        ? <Download className="w-3.5 h-3.5" />
                                        : <FileText className="w-3.5 h-3.5" />}
                                    {label && <span>{label}</span>}
                                  </Button>
                                );
                              });
                            })()}

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => openPhotos(order.id)}
                              title="View individual photos"
                            >
                              <ShoppingBag className="w-4 h-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
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

                            {/* Delete — only visible on hover, only for unpaid orders */}
                            {!isPaid && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setDeleteId(order.id)}
                                title="Delete order"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* ═══════════════════════════════════════════
             Collapsible secondary sections
             ═══════════════════════════════════════════ */}
          <div className="mt-10 space-y-2">

            {/* ─── Affiliate Payouts ─── */}
            <div className="rounded-xl border">
              <button
                onClick={() => {
                  setShowPayouts(!showPayouts);
                  if (!showPayouts && payoutRequests.length === 0) fetchPayouts();
                }}
                className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors rounded-xl"
              >
                <span className="font-display text-sm font-semibold text-foreground">Affiliate Payouts</span>
                {showPayouts ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
              {showPayouts && (
                <div className="px-4 pb-4">
                  {payoutsLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : payoutRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No payout requests</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
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
                                <span className="font-medium text-sm">{p.affiliate_name}</span>
                                <span className="block text-xs text-muted-foreground">{p.affiliate_email}</span>
                              </TableCell>
                              <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right font-medium">{"\u00A3"}{Number(p.amount).toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge variant={p.status === "paid" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                                  {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right space-x-1">
                                {p.status === "pending" && (
                                  <>
                                    <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => handlePayoutAction(p.id, "paid")}>Mark Paid</Button>
                                    <Button size="sm" variant="ghost" className="rounded-lg text-xs text-destructive" onClick={() => handlePayoutAction(p.id, "rejected")}>Reject</Button>
                                  </>
                                )}
                                {p.paid_at && (
                                  <span className="text-xs text-muted-foreground">Paid {new Date(p.paid_at).toLocaleDateString()}</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─── Reward Submissions ─── */}
            <div className="rounded-xl border">
              <button
                onClick={() => {
                  setShowRewards(!showRewards);
                  if (!showRewards && rewardSubmissions.length === 0) fetchRewardSubmissions();
                }}
                className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors rounded-xl"
              >
                <span className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                  <Star className="w-4 h-4" /> Reward Submissions
                </span>
                {showRewards ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
              {showRewards && (
                <div className="px-4 pb-4">
                  {rewardsLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : rewardSubmissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No reward submissions</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Affiliate</TableHead>
                            <TableHead>Task</TableHead>
                            <TableHead>Proof</TableHead>
                            <TableHead className="text-right">Points</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rewardSubmissions.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell>
                                <span className="font-medium text-sm">{r.affiliate_name}</span>
                                <span className="block text-xs text-muted-foreground">{r.affiliate_email}</span>
                              </TableCell>
                              <TableCell className="text-sm">{r.task_key.replace(/_/g, " ")}</TableCell>
                              <TableCell>
                                <a href={r.proof_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm">
                                  View <ExternalLink className="w-3 h-3" />
                                </a>
                              </TableCell>
                              <TableCell className="text-right font-medium">+{r.points}</TableCell>
                              <TableCell>
                                <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                                  {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right space-x-1">
                                {r.status === "pending" && (
                                  <>
                                    <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => handleRewardAction(r.id, "approved", r.affiliate_id, r.points)}>Approve</Button>
                                    <Button size="sm" variant="ghost" className="rounded-lg text-xs text-destructive" onClick={() => handleRewardAction(r.id, "rejected", r.affiliate_id, r.points)}>Reject</Button>
                                  </>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─── Instagram Photos ─── */}
            <div className="rounded-xl border">
              <button
                onClick={() => {
                  setShowInstagram(!showInstagram);
                  if (!showInstagram && instagramImages.length === 0) fetchInstagramImages();
                }}
                className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors rounded-xl"
              >
                <span className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                  <Instagram className="w-4 h-4" /> Instagram Photos
                </span>
                {showInstagram ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
              {showInstagram && (
                <div className="px-4 pb-4">
                  {instagramLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
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
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-muted transition-colors text-sm font-medium">
                            {instagramUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                            {instagramUploading ? "Uploading..." : "Upload Photos"}
                          </div>
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {instagramImages.length} photo{instagramImages.length !== 1 ? "s" : ""} {"\u2014"} 6 shown on site
                        </p>
                      </div>

                      {instagramImages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No Instagram photos yet</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {instagramImages.map((img, idx) => {
                            const { data: urlData } = supabase.storage.from("order-files").getPublicUrl(img.image_path);
                            return (
                              <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border">
                                <div className="aspect-square">
                                  <img src={urlData.publicUrl} alt={img.alt_text} className="w-full h-full object-cover" />
                                </div>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/20" onClick={() => moveInstagramImage(idx, "up")} disabled={idx === 0}>
                                    <ArrowUp className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/20" onClick={() => moveInstagramImage(idx, "down")} disabled={idx === instagramImages.length - 1}>
                                    <ArrowDown className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/20" onClick={() => deleteInstagramImage(img)}>
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
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════
         Dialogs
         ═══════════════════════════════════════════ */}

      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(o) => !o && setDetailOrder(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details {"\u2014"} {detailOrder?.order_name || detailOrder?.shopify_order_number || detailOrder?.id.slice(0, 8)}</DialogTitle>
            <DialogDescription>Full order information and downloads</DialogDescription>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-6">
              {/* Customer & Order Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-medium mb-1">Customer</p>
                  <p className="font-medium">{detailOrder.customer_name || "\u2014"}</p>
                  <p className="text-muted-foreground text-xs">{detailOrder.customer_email || "\u2014"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase font-medium mb-1">Shopify Order</p>
                  <p className="font-medium">{detailOrder.order_name || detailOrder.shopify_order_number || "\u2014"}</p>
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
                  <p>{detailOrder.tracking_number || "\u2014"}</p>
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

              {/* Ship to Shopify button in detail view */}
              {detailOrder.status !== "shipped" && getShopifyFulfillUrl(detailOrder) && (
                <a
                  href={getShopifyFulfillUrl(detailOrder)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  <Truck className="w-4 h-4" />
                  Fulfill on Shopify
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {/* Book Details */}
              <div>
                <p className="text-muted-foreground text-xs uppercase font-medium mb-2">Book Details</p>
                <div className="rounded-lg border p-3 space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Title:</span> {detailOrder.title_page_text}</p>
                  {detailOrder.dedication_page_enabled && (
                    <p><span className="text-muted-foreground">Dedication:</span> {detailOrder.dedication_page_text || "\u2014"}</p>
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
                  <div className="rounded-lg border divide-y">
                    {(detailOrder.line_items as Array<{ title?: string; quantity?: number; price?: string }>).map((item, i) => (
                      <div key={i} className="p-3 flex justify-between text-sm">
                        <span>{item.quantity || 1}x {item.title || "Item"}</span>
                        {item.price && <span className="text-muted-foreground">{"\u00A3"}{item.price}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PDF Downloads */}
              <div>
                <p className="text-muted-foreground text-xs uppercase font-medium mb-2">Downloads</p>
                {(() => {
                  const bl = bookLabels.get(detailOrder.id);
                  const booksToShow = bl ? bl.siblings : [detailOrder];
                  return (
                    <div className="space-y-2">
                      {booksToShow.map((book) => {
                        const bookBl = bookLabels.get(book.id);
                        const label = bookBl ? `Book ${bookBl.index} of ${bookBl.total}` : "Production PDF";
                        const titleHint = book.title_page_text || book.order_name || "";
                        return (
                          <div key={book.id} className="flex items-center gap-2">
                            <Button
                              variant={book.production_pdf_path ? "default" : "outline"}
                              size="sm"
                              className="rounded-lg"
                              onClick={() => generateAndDownloadPdf(book)}
                              disabled={pdfGenerating === book.id}
                            >
                              {pdfGenerating === book.id
                                ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                : <Download className="w-4 h-4 mr-1" />}
                              {book.production_pdf_path ? `Download ${label}` : `Generate ${label}`}
                            </Button>
                            {titleHint && <span className="text-[11px] text-muted-foreground truncate max-w-[150px]">{titleHint}</span>}
                            {!book.production_pdf_path && (
                              <span className="text-[11px] text-amber-500">Not yet generated</span>
                            )}
                          </div>
                        );
                      })}
                      {bl && booksToShow.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg mt-1"
                          onClick={async () => {
                            for (const book of booksToShow) {
                              await generateAndDownloadPdf(book);
                            }
                          }}
                          disabled={pdfGenerating !== null}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Generate & Download All ({booksToShow.length} books)
                        </Button>
                      )}
                    </div>
                  );
                })()}
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
                      <div key={p.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div className="text-sm">
                          <p className="font-medium">Page {p.page_position + 1}</p>
                          <p className="text-muted-foreground text-xs">
                            {statusLabel(p.conversion_status)} {p.is_landscape && " \u00B7 Landscape"}
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
                <SelectTrigger className="rounded-lg">
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
                className="rounded-lg"
                placeholder="e.g. RM123456789GB"
                value={editForm.tracking_number || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, tracking_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Title Page Text</Label>
              <Input
                className="rounded-lg"
                value={editForm.title_page_text || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, title_page_text: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Dedication Text</Label>
              <Input
                className="rounded-lg"
                value={editForm.dedication_page_text || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, dedication_page_text: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOrder(null)} className="rounded-lg">Cancel</Button>
            <Button onClick={saveEdit} className="rounded-lg">
              <Save className="w-4 h-4 mr-1" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation — only for unpaid orders */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this order and all associated photos. This cannot be undone.
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
                <div key={p.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="text-sm">
                    <p className="font-medium">Page {p.page_position + 1}</p>
                    <p className="text-muted-foreground text-xs">
                      {p.conversion_status} {p.is_landscape && "\u00B7 Landscape"}
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
