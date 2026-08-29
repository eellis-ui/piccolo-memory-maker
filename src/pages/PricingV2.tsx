import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ReviewsBanner from "@/components/landing/ReviewsBanner";
import PricingSectionV2 from "@/components/landing/v2/PricingSectionV2";
import { WhatChangedProvider } from "@/components/landing/v2/WhatChanged";

/**
 * TEAM PREVIEW of the proposed product page — /pricing-v2.
 *
 * Not linked from navigation and intentionally fires NO analytics
 * (no product_view, no Meta ViewContent) so demo traffic never pollutes
 * funnel metrics. The live /pricing page is untouched. Once the team signs
 * off, the V2 components replace their originals and this route is removed.
 */
const PricingV2 = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-amber-100 text-amber-900 text-center text-xs font-semibold py-1.5 px-4">
        Internal preview — proposed product page. Not linked from the site; the live /pricing page is unchanged.
      </div>
      <ReviewsBanner />
      <Navbar />
      <main className="bg-white">
        <WhatChangedProvider>
          <PricingSectionV2 />
        </WhatChangedProvider>
      </main>
      <Footer />
    </div>
  );
};

export default PricingV2;
