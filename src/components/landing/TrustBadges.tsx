import { Lock } from "lucide-react";

const TrustBadges = () => {
  return (
    <div className="w-full">
      <p className="text-xs text-muted-foreground text-center mb-3 flex items-center justify-center gap-1.5">
        <Lock className="w-3.5 h-3.5" />
        Guaranteed safe &amp; secure checkout
      </p>
      <div className="flex items-center justify-center">
        <img
          src="/images/payment-icons.png"
          alt="Accepted payment methods: American Express, PayPal, Apple Pay, Google Pay, Visa, Mastercard, Shop Pay"
          className="h-8 w-auto"
        />
      </div>
    </div>
  );
};

export default TrustBadges;
