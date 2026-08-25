/**
 * "Save your book" email capture — shown in the builder once at least one
 * photo has been converted to line art, right after the visitor has seen
 * the result. Saves the email onto the session's draft orders and emails a
 * resume link straight away; a scheduled backend job nudges once more if
 * the build stalls.
 */
import { useState } from "react";
import { Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { saveBuilderEmail } from "@/lib/guest-api";
import { trackEvent } from "@/lib/analytics-tracker";

const savedKey = (sessionId: string) => `piccoload_saved_email_${sessionId}`;
const dismissedKey = "piccoload_save_prompt_dismissed";

const SaveBookPrompt = ({ sessionId, hasConvertedPhotos }: { sessionId: string | null; hasConvertedPhotos: boolean }) => {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(
    () => !!sessionId && !!localStorage.getItem(savedKey(sessionId))
  );
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(dismissedKey) === "1"
  );

  if (!sessionId || !hasConvertedPhotos || done || dismissed) return null;

  const handleSave = async () => {
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSaving(true);
    try {
      await saveBuilderEmail(sessionId, clean);
      localStorage.setItem(savedKey(sessionId), "1");
      // Reused at checkout to pre-fill Shopify's buyer identity, so their
      // abandoned-checkout emails cover this visitor too
      localStorage.setItem("piccoload_saved_email", clean.toLowerCase());
      setDone(true);
      trackEvent("email_saved", "/builder");
      toast.success("Book saved! Check your inbox for your link.");
    } catch {
      toast.error("Couldn't save right now — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mb-8 rounded-xl border bg-muted/40 p-4 relative">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        onClick={() => {
          sessionStorage.setItem(dismissedKey, "1");
          setDismissed(true);
        }}
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <Mail className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">Love how your pages look? Save your book</p>
          <p className="text-xs text-muted-foreground mb-3">
            We&rsquo;ll email you a link so you can finish any time, on any device.
            No spam — just your link.
          </p>
          <form
            className="flex flex-col sm:flex-row gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="h-9 text-sm"
              disabled={saving}
            />
            <Button type="submit" size="sm" className="h-9" disabled={saving}>
              {saving ? "Saving…" : "Email me my link"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SaveBookPrompt;
