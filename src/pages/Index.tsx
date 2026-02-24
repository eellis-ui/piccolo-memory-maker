import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ReviewsBanner from "@/components/landing/ReviewsBanner";
import HeroSection from "@/components/landing/HeroSection";
import HappyCustomersSection from "@/components/landing/HappyCustomersSection";
import HeroVideoSection from "@/components/landing/HeroVideoSection";
import LifestyleBanner from "@/components/landing/LifestyleBanner";
import BeforeAfterSection from "@/components/landing/BeforeAfterSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";

import PricingSection from "@/components/landing/PricingSection";
import StorySection from "@/components/landing/StorySection";
import CTASection from "@/components/landing/CTASection";

const Index = () => {
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
        
        <PricingSection />
        <StorySection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
