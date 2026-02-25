import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PricingSection from "@/components/landing/PricingSection";

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16 bg-white">
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
