import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BarChart3, ShoppingBag, Users, Handshake, Image as ImageIcon,
  Menu, X, ExternalLink, LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";


export type AdminSection = "dashboard" | "analytics" | "orders" | "customers" | "affiliates" | "content";

export const ADMIN_SECTIONS: AdminSection[] = ["dashboard", "analytics", "orders", "customers", "affiliates", "content"];

interface NavItem {
  key: AdminSection;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
}

const NAV_GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", description: "Live activity, funnel and recent orders", icon: LayoutDashboard },
      { key: "analytics", label: "Analytics", description: "Book-builder funnel and visitor journeys", icon: BarChart3 },
    ],
  },
  {
    heading: "Sales",
    items: [
      { key: "orders", label: "Orders", description: "Manage, fulfil and download every order", icon: ShoppingBag },
      { key: "customers", label: "Customers", description: "Everyone who has bought, with order history", icon: Users },
    ],
  },
  {
    heading: "Growth",
    items: [
      { key: "affiliates", label: "Affiliates", description: "Payout requests and reward submissions", icon: Handshake },
      { key: "content", label: "Content", description: "Instagram photos shown on the site", icon: ImageIcon },
    ],
  },
];

const TITLES: Record<AdminSection, string> = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  orders: "Orders",
  customers: "Customers",
  affiliates: "Affiliates",
  content: "Content",
};

interface AdminLayoutProps {
  section: AdminSection;
  unfulfilledCount?: number;
  liveVisitors?: number;
  children: ReactNode;
}

/**
 * CRM shell for /admin: a fixed left sidebar on desktop, a slide-in drawer on
 * mobile, and a topbar carrying the section title. Page content scrolls
 * independently of the navigation so the sidebar is always reachable.
 */
const AdminLayout = ({ section, unfulfilledCount = 0, liveVisitors, children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const active = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.key === section);

  const signOut = () => {
    supabase.auth.signOut({ scope: "local" }).finally(() => {
      window.location.href = "/";
    });
  };

  const nav = (
    <nav className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <Link to="/admin" className="flex items-center gap-3" onClick={() => setDrawerOpen(false)}>
          <img src="/images/piccoload-logo-large.png" alt="Piccoload" className="h-8 w-auto" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Admin</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.heading}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.heading}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.key === section;
                const Icon = item.icon;
                const badge =
                  item.key === "orders" && unfulfilledCount > 0 ? unfulfilledCount :
                  item.key === "dashboard" && liveVisitors && liveVisitors > 0 ? liveVisitors : null;
                return (
                  <li key={item.key}>
                    <Link
                      to={item.key === "dashboard" ? "/admin" : `/admin/${item.key}`}
                      onClick={() => setDrawerOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-foreground text-background"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {badge !== null && (
                        <span className={`min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold ${
                          isActive ? "bg-background/20 text-background" : "bg-primary/15 text-primary"
                        }`}>
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3 space-y-0.5">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Back to site
        </Link>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-muted/30 md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-background border-r border-border">
        {nav}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-background shadow-xl">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-4 p-1.5 rounded-md hover:bg-muted"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      {/* Content column */}
      <div className="flex-1 min-w-0 md:pl-64">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-14">
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-md hover:bg-muted"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold leading-tight truncate">{TITLES[section]}</h1>
              {active && (
                <p className="text-xs text-muted-foreground truncate hidden sm:block">{active.description}</p>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => navigate("/admin/orders")}
                className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                {unfulfilledCount > 0 ? `${unfulfilledCount} to fulfil` : "All orders fulfilled"}
              </button>
            </div>
          </div>
        </header>
        <main className="px-4 sm:px-6 py-6 max-w-[1400px]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
