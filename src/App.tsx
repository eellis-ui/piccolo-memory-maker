import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BasketProvider } from "@/contexts/BasketContext";
import Index from "./pages/Index";
import Builder from "./pages/Builder";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import MyOrders from "./pages/MyOrders";
import HowItWorks from "./pages/HowItWorks";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import ResetPassword from "./pages/ResetPassword";
import OrderReview from "./pages/OrderReview";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RefundPolicy from "./pages/RefundPolicy";
import TermsOfService from "./pages/TermsOfService";
import Affiliates from "./pages/Affiliates";
import BecomeAffiliate from "./pages/BecomeAffiliate";
import ScrollToTop from "./components/ScrollToTop";
import ChatWidget from "./components/ChatWidget";
import { useClaimOrders } from "./hooks/use-claim-orders";

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
        <BasketProvider>
          <AppInner />
          <ScrollToTop />
          <ChatWidget />
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
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/order-review" element={<OrderReview />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/affiliates" element={<Affiliates />} />
            <Route path="/become-an-affiliate" element={<BecomeAffiliate />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BasketProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
