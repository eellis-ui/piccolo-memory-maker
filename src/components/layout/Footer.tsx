import { Link } from "react-router-dom";
import { Instagram } from "lucide-react";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.7a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.13z" />
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
          <img
            src="/images/payment-icons.png"
            alt="Accepted payment methods: American Express, PayPal, Apple Pay, Google Pay, Visa, Mastercard, Shop Pay"
            className="h-8 w-auto"
          />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
