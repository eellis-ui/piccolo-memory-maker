import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-admin";
import {
  Loader2, Package, Trash2, Edit2, Truck, Download, ChevronDown, X, Save,
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

  useEffect(() => {
    if (!roleLoading && !isAdmin) navigate("/auth");
  }, [roleLoading, isAdmin, navigate]);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setOrders(data as OrderRow[]);
    setLoading(false);
    setSelected(new Set());
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
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Details</TableHead>
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
                        {order.title_page_text || "Untitled Book"}
                        <span className="block text-xs text-muted-foreground">{order.id.slice(0, 8)}…</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColor(order.status) as any}>
                          {statusLabel(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.tracking_number || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.extra_pages > 0 && <span>+{order.extra_pages} pages </span>}
                        {order.unique_photos && <span>· Unique </span>}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openPhotos(order.id)}
                          title="View photos"
                        >
                          <Download className="w-4 h-4" />
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
        </div>
      </main>
      <Footer />

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
