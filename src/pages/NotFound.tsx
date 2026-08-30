import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

// A 404 for paid traffic must not be a dead end: keep the nav, keep the
// cart, and point at the product — a stale ad URL still deserves a chance
// to convert.
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center py-20">
          <h1 className="font-display text-5xl font-bold text-foreground mb-3">404</h1>
          <p className="text-lg text-muted-foreground mb-8">
            That page has wandered off to be colored in.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="rounded-lg">
              <Link to="/pricing">Shop the Coloring Book</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-lg">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
