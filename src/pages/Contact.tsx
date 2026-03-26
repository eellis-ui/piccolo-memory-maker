import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { toast } from "sonner";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [saveInfo, setSaveInfo] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent! We'll get back to you soon.");
    setName("");
    setEmail("");
    setMessage("");
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
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="save-info"
                    checked={saveInfo}
                    onCheckedChange={(checked) => setSaveInfo(checked === true)}
                  />
                  <label htmlFor="save-info" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                    Save my name, email, and website in this browser for the next time I comment.
                  </label>
                </div>
                <Button type="submit" className="px-10 py-5" size="lg">
                  Submit Now
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
