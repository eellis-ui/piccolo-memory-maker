import { Link } from "react-router-dom";
import piccoloadLogo from "@/assets/piccoload-logo.png";

const Footer = () => {
  return (
    <footer className="bg-cream border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="inline-block">
              <img src={piccoloadLogo} alt="Piccoload – From pic to pen" className="h-10 w-auto" />
            </Link>
            <p className="mt-4 text-muted-foreground text-sm max-w-md">
              Transform your cherished photos into beautiful, personalized coloring books. 
              A meaningful gift that brings memories to life through art.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-4">
              Quick Links
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  FAQs
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/my-orders" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Track My Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-4">
              Support
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Our Story
                </Link>
              </li>
              <li>
                <a href="mailto:hello@piccoload.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  hello@piccoload.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Piccoload. All rights reserved. Made with love in the USA.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
