import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Actually delivers the message via the send-contact-message edge function.
  // The previous handler showed "Message sent!" and threw every enquiry away.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-contact-message", {
        body: { name, email, message },
      });
      if (error || !data?.success) {
        throw new Error(error?.message || "send failed");
      }
      toast.success("Message sent! We'll get back to you soon.");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      console.error("Contact form error:", err);
      toast.error("Your message couldn't be sent", {
        description: "Please try again, or email us directly at hello@piccoload.com.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-8 sm:pt-16">
        <section className="py-12 sm:py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center sm:text-left">
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
                WE WOULD LOVE TO HEAR FROM YOU.
              </h1>

              <p className="text-muted-foreground mb-10 leading-relaxed">
                We're here to help! Whether you have a question, need support, or just want to say hello, our team is ready to assist you.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    required
                    className="rounded-lg"
                  />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className="rounded-lg"
                  />
                </div>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Message"
                  required
                  rows={8}
                  className="rounded-lg"
                />
                <Button type="submit" className="px-10 py-5" size="lg" disabled={sending}>
                  {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {sending ? "Sending…" : "Submit Now"}
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
