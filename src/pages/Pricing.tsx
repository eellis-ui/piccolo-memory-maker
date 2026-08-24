import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ReviewsBanner from "@/components/landing/ReviewsBanner";
import PricingSection from "@/components/landing/PricingSection";
import { trackProductView } from "@/lib/shopify-analytics";
import { trackEvent } from "@/lib/analytics-tracker";
import { SHOPIFY_VARIANTS } from "@/lib/shopify";

const Pricing = () => {
  useEffect(() => {
    trackProductView({
      id: "gid://shopify/Product/15269689852277",
      title: "Personalized Coloring Book",
      price: "35.00",
      vendor: "Piccoload",
      variantId: SHOPIFY_VARIANTS.COLORING_BOOK,
      variantTitle: "20 Pages",
    });
    // Meta ViewContent is fired by PricingSection, which owns the bundle
    // selection and therefore the price to report.
    trackEvent("product_view", "/pricing");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <ReviewsBanner />
      <Navbar />
      <main className="bg-white">
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
