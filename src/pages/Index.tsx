import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ReviewsBanner from "@/components/landing/ReviewsBanner";
import HeroSection from "@/components/landing/HeroSection";
import HappyCustomersSection from "@/components/landing/HappyCustomersSection";
import { trackProductView } from "@/lib/shopify-analytics";
import { trackEvent } from "@/lib/analytics-tracker";
import { metaViewContent } from "@/lib/meta-pixel";
import { SHOPIFY_VARIANTS } from "@/lib/shopify";
import HeroVideoSection from "@/components/landing/HeroVideoSection";
import LifestyleBanner from "@/components/landing/LifestyleBanner";
import BeforeAfterSection from "@/components/landing/BeforeAfterSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import WhyPiccoloSection from "@/components/landing/WhyPiccoloSection";
import CatBanner from "@/components/landing/CatBanner";
import InstagramSection from "@/components/landing/InstagramSection";
import CTASection from "@/components/landing/CTASection";

const Index = () => {
  useEffect(() => {
    trackProductView({
      id: "gid://shopify/Product/15269689852277",
      title: "Personalised Coloring Book",
      price: "35.00",
      vendor: "Piccoload",
      variantId: SHOPIFY_VARIANTS.COLORING_BOOK,
      variantTitle: "20 Pages",
    });
    trackEvent("product_view", "/");
    metaViewContent("Landing Page");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <ReviewsBanner />
      <Navbar />
      <main>
        <HeroSection />
        <ReviewsBanner />
        <HappyCustomersSection />
        <HeroVideoSection />
        <BeforeAfterSection />
        <LifestyleBanner />
        <HowItWorksSection />
        <WhyPiccoloSection />
        <CatBanner />
        <InstagramSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
