import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useBasket } from "@/contexts/BasketContext";
import { Badge } from "@/components/ui/badge";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { item } = useBasket();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "Our Story" },
    { href: "/faq", label: "FAQs" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img alt="Piccoload – From pic to pen" className="h-10 w-auto" src="/lovable-uploads/bc0afa55-54e9-40fc-b263-333f5ed085bc.png" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA + Cart */}
          <div className="hidden md:flex items-center space-x-4">
            {item && (
              <Link to="/builder" className="relative p-2 hover:bg-muted rounded-xl transition-colors">
                <ShoppingCart className="w-5 h-5 text-foreground" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground rounded-full">
                  {item.quantity}
                </Badge>
              </Link>
            )}
            <Button asChild className="rounded-2xl px-6">
              <Link to="/builder">Start Creating</Link>
            </Button>
          </div>

          {/* Mobile Menu Button + Cart */}
          <div className="md:hidden flex items-center gap-2">
            {item && (
              <Link to="/builder" className="relative p-2">
                <ShoppingCart className="w-5 h-5 text-foreground" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground rounded-full">
                  {item.quantity}
                </Badge>
              </Link>
            )}
            <button
              className="p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-foreground" />
              ) : (
                <Menu className="h-6 w-6 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Button asChild className="rounded-2xl mx-2">
                <Link to="/builder" onClick={() => setIsMenuOpen(false)}>
                  Start Creating
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
