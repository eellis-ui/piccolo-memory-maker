import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isAdminHost } from "@/lib/admin-host";
import { BasketProvider } from "@/contexts/BasketContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import ScrollToTop from "./components/ScrollToTop";
import ChatWidget from "./components/ChatWidget";
import ShopifyAnalytics from "./components/ShopifyAnalytics";
import { useClaimOrders } from "./hooks/use-claim-orders";

// Only the landing page is loaded eagerly; every other route is split into
// its own chunk so first paint doesn't pay for the builder/admin bundles.
const Builder = lazy(() => import("./pages/Builder"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Pricing = lazy(() => import("./pages/Pricing"));
const About = lazy(() => import("./pages/About"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Contact = lazy(() => import("./pages/Contact"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const OrderReview = lazy(() => import("./pages/OrderReview"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Affiliates = lazy(() => import("./pages/Affiliates"));
const BecomeAffiliate = lazy(() => import("./pages/BecomeAffiliate"));
const Account = lazy(() => import("./pages/Account"));

const queryClient = new QueryClient();

const AppInner = () => {
  useClaimOrders();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BasketProvider>
            <AppInner />
            <ScrollToTop />
            {/* Shop-only widgets. The dashboard is an internal tool: it has no
                basket, and staff should not be firing customer analytics or
                seeing the customer support chat while working orders. */}
            {!isAdminHost() && (
              <>
                <ShopifyAnalytics />
                <ChatWidget />
              </>
            )}
            <Suspense fallback={null}>
              {isAdminHost() ? (
                /* admin.piccoload.com serves the dashboard and nothing else.
                   Customer routes are not reachable here, so a mistyped path
                   cannot drop a staff member into the shop mid-task. */
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<Admin />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              ) : (
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/about" element={<About />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/builder" element={<Builder />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/my-orders" element={<MyOrders />} />
                <Route path="/account" element={<Account />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/order-review" element={<OrderReview />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/affiliates" element={<Affiliates />} />
                <Route path="/become-an-affiliate" element={<BecomeAffiliate />} />
                {/* Legacy Shopify-style URLs (ads, catalog, old emails) → shop page */}
                <Route path="/products" element={<Navigate to="/pricing" replace />} />
                <Route path="/products/*" element={<Navigate to="/pricing" replace />} />
                <Route path="/collections/*" element={<Navigate to="/pricing" replace />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              )}
            </Suspense>
          </BasketProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
