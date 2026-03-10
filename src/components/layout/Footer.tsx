import { Link } from "react-router-dom";
import { Instagram } from "lucide-react";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.7a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.13z" />
  </svg>
);

const PaymentIcon = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div className="w-12 h-8 rounded border border-border bg-background flex items-center justify-center" title={label}>
    {children}
  </div>
);

const ApplePayIcon = () => (
  <svg viewBox="0 0 50 20" className="w-8 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.6 3.8c-.6.7-1.5 1.3-2.4 1.2-.1-1 .4-2 .9-2.6C8.7 1.6 9.7 1 10.5 1c.1 1-.3 2-.9 2.8zm.9 1.4c-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.8 2.1 1.1 0 1.5-.7 2.8-.7 1.3 0 1.7.7 2.8.7 1.2 0 2-1 2.7-2.1.9-1.2 1.2-2.4 1.2-2.4 0 0-2.4-1-2.4-3.7 0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.9l-.2.6z" fill="#000"/>
    <path d="M21.1 2.5c3.2 0 5.4 2.2 5.4 5.4 0 3.2-2.3 5.4-5.5 5.4h-3.5v5.6h-2.6V2.5h6.2zm-3.6 8.7h2.9c2.2 0 3.5-1.2 3.5-3.3 0-2.1-1.3-3.3-3.5-3.3h-2.9v6.6zm10 4.6c0-2.1 1.6-3.4 4.5-3.5l3.3-.2v-.9c0-1.3-.9-2.1-2.4-2.1-1.4 0-2.3.7-2.5 1.7h-2.4c.1-2.2 2-3.8 5-3.8 2.9 0 4.8 1.5 4.8 3.9v8.2h-2.4v-2h-.1c-.7 1.3-2.2 2.2-3.8 2.2-2.4 0-4-1.5-4-3.5zm7.8-1v-1l-3 .2c-1.5.1-2.3.7-2.3 1.7s.9 1.7 2.1 1.7c1.7 0 3.2-1.1 3.2-2.6zm4.7 7.5v-2c.2 0 .6.1.9.1 1.3 0 2-.5 2.4-1.9l.3-.8-4.6-12.7h2.7l3.2 10.3h.1l3.2-10.3h2.6l-4.7 13.3c-1.1 3-2.3 4-4.9 4-.3 0-.9 0-1.2-.1z" fill="#000"/>
  </svg>
);

const GooglePayIcon = () => (
  <svg viewBox="0 0 50 20" className="w-8 h-5" xmlns="http://www.w3.org/2000/svg">
    <text x="2" y="15" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="bold" fill="#4285F4">G</text>
    <text x="11" y="15" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="500" fill="#555">Pay</text>
  </svg>
);

const PayPalIcon = () => (
  <svg viewBox="0 0 40 20" className="w-7 h-4" xmlns="http://www.w3.org/2000/svg">
    <text x="2" y="14" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="bold">
      <tspan fill="#253B80">Pay</tspan><tspan fill="#179BD7">Pal</tspan>
    </text>
  </svg>
);

const AmexIcon = () => (
  <svg viewBox="0 0 40 20" className="w-7 h-4" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="20" rx="2" fill="#2E77BC" />
    <text x="20" y="13" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="bold" fill="white">AMEX</text>
  </svg>
);

const VisaIcon = () => (
  <svg viewBox="0 0 40 20" className="w-7 h-4" xmlns="http://www.w3.org/2000/svg">
    <text x="20" y="15" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fontStyle="italic" fill="#1A1F71">VISA</text>
  </svg>
);

const MastercardIcon = () => (
  <svg viewBox="0 0 40 24" className="w-7 h-4" xmlns="http://www.w3.org/2000/svg">
    <circle cx="15" cy="12" r="8" fill="#EB001B" />
    <circle cx="25" cy="12" r="8" fill="#F79E1B" />
    <path d="M20 5.7a8 8 0 0 1 0 12.6 8 8 0 0 1 0-12.6z" fill="#FF5F00" />
  </svg>
);

const MaestroIcon = () => (
  <svg viewBox="0 0 40 24" className="w-7 h-4" xmlns="http://www.w3.org/2000/svg">
    <circle cx="15" cy="12" r="8" fill="#0099DF" />
    <circle cx="25" cy="12" r="8" fill="#000" />
    <path d="M20 5.7a8 8 0 0 1 0 12.6 8 8 0 0 1 0-12.6z" fill="#00578F" />
  </svg>
);

const ShopPayIcon = () => (
  <svg viewBox="0 0 40 20" className="w-7 h-4" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="20" rx="3" fill="#5A31F4" />
    <text x="20" y="13" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="6" fontWeight="bold" fill="white">Shop</text>
  </svg>
);

const Footer = () => {
  return (
    <footer className="bg-cream border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
          {/* Links */}
          <div>
            <h4 className="font-display text-base font-semibold text-foreground mb-5">
              Links!
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Shop
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Our Story
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Legals */}
          <div>
            <h4 className="font-display text-base font-semibold text-foreground mb-5">
              Legals
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/become-an-affiliate" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Become an Affiliate!
                </Link>
              </li>
            </ul>
          </div>

          {/* Our Store / Socials */}
          <div>
            <h4 className="font-display text-base font-semibold text-foreground mb-5">
              Our store
            </h4>
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/officialpiccoload/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted-foreground/20 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.tiktok.com/@piccoload"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted-foreground/20 transition-colors"
                aria-label="TikTok"
              >
                <TikTokIcon className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © Piccolo'd {new Date().getFullYear()}. All Rights Reserved.
          </p>

          {/* Payment icons */}
          <div className="flex items-center gap-2">
            <PaymentIcon label="Apple Pay"><ApplePayIcon /></PaymentIcon>
            <PaymentIcon label="Google Pay"><GooglePayIcon /></PaymentIcon>
            <PaymentIcon label="PayPal"><PayPalIcon /></PaymentIcon>
            <PaymentIcon label="American Express"><AmexIcon /></PaymentIcon>
            <PaymentIcon label="Visa"><VisaIcon /></PaymentIcon>
            <PaymentIcon label="Mastercard"><MastercardIcon /></PaymentIcon>
            <PaymentIcon label="Maestro"><MaestroIcon /></PaymentIcon>
            <PaymentIcon label="Shop Pay"><ShopPayIcon /></PaymentIcon>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
