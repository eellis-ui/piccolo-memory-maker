import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import piccoloadLogo from "@/assets/piccoload-logo.png";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "Our Story" },
  { href: "/faq", label: "FAQs" }];


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
            {navLinks.map((link) =>
            <Link
              key={link.href}
              to={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">

                {link.label}
              </Link>
            )}
          </div>

          {/* CTA Button */}
          <div className="hidden md:flex items-center space-x-4">
            <Button asChild className="rounded-2xl px-6">
              <Link to="/builder">Start Creating</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu">

            {isMenuOpen ?
            <X className="h-6 w-6 text-foreground" /> :

            <Menu className="h-6 w-6 text-foreground" />
            }
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen &&
        <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) =>
            <Link
              key={link.href}
              to={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
              onClick={() => setIsMenuOpen(false)}>

                  {link.label}
                </Link>
            )}
              <Button asChild className="rounded-2xl mx-2">
                <Link to="/builder" onClick={() => setIsMenuOpen(false)}>
                  Start Creating
                </Link>
              </Button>
            </div>
          </div>
        }
      </div>
    </nav>);

};

export default Navbar;