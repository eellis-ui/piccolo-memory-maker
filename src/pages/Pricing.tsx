import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PricingSection from "@/components/landing/PricingSection";
import { trackProductView } from "@/lib/shopify-analytics";
import { trackEvent } from "@/lib/analytics-tracker";
import { metaViewContent } from "@/lib/meta-pixel";
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
    trackEvent("product_view", "/pricing");
    metaViewContent();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="bg-white">
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
