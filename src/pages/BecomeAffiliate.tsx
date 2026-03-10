import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ReviewsBanner from "@/components/landing/ReviewsBanner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const benefits = [
{
  number: "10%",
  title: "Discount for Customers",
  description: "Get your own unique discount code to share with your audience. Your followers save 10% on every order."
},
{
  number: "10%",
  title: "Commission for You",
  description: "Earn 10% commission on every sale made using your code. No caps, no limits."
},
{
  number: "∞",
  title: "Unlimited Earning",
  description: "Share your code on Instagram, TikTok, or anywhere you like. We track every sale automatically."
}];


const steps = [
{ number: "01", text: "Create your affiliate account" },
{ number: "02", text: "Choose your unique discount code" },
{ number: "03", text: "Share it with your audience" },
{ number: "04", text: "Earn commission on every sale" }];


const BecomeAffiliate = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-24 bg-cream">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          

          
          <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground mb-6 uppercase">
            Share the Love.<br />Earn the Rewards.
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            Love Piccoload? Join our affiliate programme and earn money doing what you already do — sharing amazing things with your audience.
          </p>
          <Link to="/affiliates">
            <Button size="lg" className="rounded-lg text-base px-10 py-6 bg-foreground text-background hover:bg-foreground/90">
              Sign Up Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <p className="text-sm tracking-[0.3em] uppercase text-muted-foreground text-center mb-3 font-medium">
            Why Join?
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground text-center mb-16 uppercase">
            Everyone Wins
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {benefits.map((benefit) =>
            <div
              key={benefit.title}
              className="text-center p-10 rounded-lg border border-border bg-card">
              
                <span className="font-display text-5xl font-bold text-foreground block mb-4">
                  {benefit.number}
                </span>
                <h3 className="font-display text-lg font-semibold text-foreground mb-3 uppercase tracking-wide">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-16">
          <ReviewsBanner />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-cream">
        <div className="container mx-auto px-4 max-w-2xl">
          <p className="text-sm tracking-[0.3em] uppercase text-muted-foreground text-center mb-3 font-medium">
            Getting Started
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground text-center mb-16 uppercase">
            How It Works
          </h2>
          <div className="space-y-4">
            {steps.map((step, i) =>
            <div
              key={step.number}
              className="flex items-center gap-6 bg-background rounded-lg p-5 border border-border">
              
                <span className="font-display text-2xl font-bold text-foreground w-10 shrink-0">
                  {step.number}
                </span>
                <div className="h-px flex-1 bg-border hidden sm:block" />
                <p className="text-base text-foreground font-medium flex-1">{step.text}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-6 uppercase">
            Ready to Start?
          </h2>
          <p className="text-muted-foreground text-base mb-10 max-w-md mx-auto leading-relaxed">
            It only takes a minute to sign up. No fees, no obligations — just share and earn.
          </p>
          <Link to="/affiliates">
            <Button size="lg" className="rounded-lg text-base px-10 py-6 bg-foreground text-background hover:bg-foreground/90">
              Become an Affiliate
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>);

};

export default BecomeAffiliate;