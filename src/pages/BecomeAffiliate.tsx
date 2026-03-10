import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gift, TrendingUp, Share2, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const benefits = [
  {
    icon: Gift,
    title: "10% Discount Code",
    description: "Get your own unique discount code to share with your audience. Your followers save 10% on every order.",
  },
  {
    icon: TrendingUp,
    title: "10% Commission",
    description: "Earn 10% commission on every sale made using your code. No caps, no limits.",
  },
  {
    icon: Share2,
    title: "Easy Sharing",
    description: "Share your code on Instagram, TikTok, or anywhere you like. We track every sale automatically.",
  },
];

const steps = [
  { number: "01", text: "Create your affiliate account" },
  { number: "02", text: "Choose your unique discount code" },
  { number: "03", text: "Share it with your audience" },
  { number: "04", text: "Earn commission on every sale" },
];

const BecomeAffiliate = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-20 bg-cream">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="font-display text-5xl md:text-6xl font-bold text-foreground mb-6">
            BECOME AN AFFILIATE
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Love Piccoload? Join our affiliate programme and earn money by sharing the love.
            Your followers get 10% off, and you earn 10% commission on every sale.
          </p>
          <Link to="/affiliates">
            <Button size="lg" className="rounded-2xl text-base px-10 py-6">
              Sign Up Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground text-center mb-14">
            Why Join?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="text-center p-8 rounded-3xl bg-cream"
              >
                <div className="w-14 h-14 rounded-2xl bg-foreground text-background flex items-center justify-center mx-auto mb-5">
                  <benefit.icon className="w-7 h-7" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-cream">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground text-center mb-14">
            How It Works
          </h2>
          <div className="space-y-6">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex items-center gap-6 bg-background rounded-2xl p-6"
              >
                <span className="font-display text-3xl font-bold text-muted-foreground/40">
                  {step.number}
                </span>
                <p className="text-lg text-foreground font-medium">{step.text}</p>
                <CheckCircle2 className="w-5 h-5 text-primary ml-auto shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
            Ready to Start Earning?
          </h2>
          <p className="text-muted-foreground text-lg mb-10">
            It only takes a minute to sign up. No fees, no obligations — just share and earn.
          </p>
          <Link to="/affiliates">
            <Button size="lg" className="rounded-2xl text-base px-10 py-6">
              Become an Affiliate
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BecomeAffiliate;
