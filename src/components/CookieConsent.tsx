import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const STORAGE_KEY = "cookie_consent";

const isEuTimezone = (): boolean => {
  try {
    return /^Europe\//.test(Intl.DateTimeFormat().resolvedOptions().timeZone || "");
  } catch {
    return false;
  }
};

/**
 * Opt-in cookie banner for EU/UK visitors (timezone heuristic), delivering
 * what the privacy policy promises. index.html revokes Meta pixel consent
 * for these visitors before init; this banner grants or keeps it revoked.
 * US and other visitors never see it.
 */
const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!isEuTimezone()) return;
      if (localStorage.getItem(STORAGE_KEY)) return;
      setVisible(true);
    } catch {
      // storage unavailable — leave consent revoked, show nothing
    }
  }, []);

  const decide = (granted: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, granted ? "granted" : "denied");
    } catch { /* private mode — the choice just won't persist */ }
    if (granted) {
      try {
        window.fbq?.("consent", "grant");
      } catch { /* pixel blocked — nothing to grant */ }
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[70] bg-background border-t border-border shadow-lg px-4 py-3">
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-3">
        <p className="text-xs text-muted-foreground flex-1 text-center sm:text-left">
          We use cookies for analytics and to measure our advertising. See our{" "}
          <Link to="/privacy-policy" className="underline text-foreground">Privacy Policy</Link>.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => decide(false)}>
            Decline
          </Button>
          <Button size="sm" className="rounded-lg" onClick={() => decide(true)}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
