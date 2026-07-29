/**
 * Staff dashboard — the order desk.
 *
 * Built around the question staff actually arrive with: "a customer is on the
 * phone about order X, what is going on with it?" So search is the primary
 * control, and anything needing a human is surfaced before the list rather
 * than being something you have to go looking for.
 *
 * Served at admin.piccoload.com. Access is gated on the admin role and
 * enforced by RLS, not by the route.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsAdmin } from "@/hooks/use-admin";
import {
  attentionFor,
  matchesQuery,
  useAdminOrders,
  useOrderCounts,
  type AdminOrder,
} from "@/hooks/use-admin-orders";
import OrderDetailPanel from "@/components/admin/OrderDetailPanel";

type StatusFilter = "attention" | "all" | "draft" | "paid" | "shipped";

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "attention", label: "Needs attention" },
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "paid", label: "Paid" },
  { key: "shipped", label: "Shipped" },
];

const statusTone: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  paid: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  shipped: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
};

function StatCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const { orders, loading, error, refresh } = useAdminOrders(isAdmin);
  const counts = useOrderCounts(orders);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("attention");
  const [selected, setSelected] = useState<AdminOrder | null>(null);

  const visible = useMemo(() => {
    return orders.filter((order) => {
      if (!matchesQuery(order, query)) return false;
      if (filter === "all") return true;
      if (filter === "attention") return attentionFor(order) !== null;
      return order.status === filter;
    });
  }, [orders, query, filter]);

  // A search should look everywhere, not just inside the current tab — staff
  // typing an order number want that order, whatever state it is in.
  const hiddenByFilter = useMemo(() => {
    if (!query.trim() || filter === "all") return 0;
    return orders.filter((o) => matchesQuery(o, query)).length - visible.length;
  }, [orders, query, filter, visible.length]);

  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-semibold">Staff access only</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with an account that has the admin role.
          </p>
        </div>
        <Button onClick={() => navigate("/auth")}>Sign in</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <h1 className="font-display text-xl font-semibold">Order desk</h1>
            <p className="text-xs text-muted-foreground">Piccoload staff dashboard</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard
            label="Needs attention"
            value={counts.needsAttention}
            tone={counts.needsAttention > 0 ? "text-destructive" : undefined}
          />
          <StatCard label="Drafts" value={counts.draft} />
          <StatCard label="Paid" value={counts.paid} />
          <StatCard label="Shipped" value={counts.shipped} />
          <StatCard label="Total" value={counts.total} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[16rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Order number, Shopify number, name, email or phone"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? "default" : "outline"}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                {f.key === "attention" && counts.needsAttention > 0 && (
                  <span className="ml-1.5 rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">
                    {counts.needsAttention}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {hiddenByFilter > 0 && (
          <button
            onClick={() => setFilter("all")}
            className="mt-3 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {hiddenByFilter} more match “{query.trim()}” in other tabs — show all
          </button>
        )}

        {error && (
          <p className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {loading && orders.length === 0 ? (
          <div className="mt-16 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-16 text-center text-sm text-muted-foreground">
            <Package className="mx-auto mb-3 h-6 w-6" />
            {filter === "attention" && !query.trim()
              ? "Nothing needs attention. Every paid order has its art."
              : "No orders match."}
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {visible.map((order) => {
              const attention = attentionFor(order);
              const converted = order.photos.filter((p) => p.conversion_status === "completed").length;
              return (
                <li key={order.id}>
                  <button
                    onClick={() => setSelected(order)}
                    className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-[10rem] flex-1">
                      <p className="font-medium">
                        {order.order_name ?? order.id.slice(0, 8)}
                        {order.shopify_order_number && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {order.shopify_order_number}
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.customer_name || order.customer_email || "No customer details"}
                      </p>
                    </div>

                    <span className="text-xs tabular-nums text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-GB")}
                    </span>

                    <span className="text-xs tabular-nums text-muted-foreground">
                      {converted}/{order.photos.length} art
                    </span>

                    <Badge
                      variant="secondary"
                      className={`border-0 text-[10px] uppercase tracking-wider ${
                        statusTone[order.status ?? ""] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {order.status ?? "unknown"}
                    </Badge>

                    {attention && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        {attention.label}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <OrderDetailPanel
        order={selected}
        onClose={() => setSelected(null)}
        onChanged={() => void refresh()}
      />
    </div>
  );
};

export default AdminDashboard;
