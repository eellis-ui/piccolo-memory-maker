import { useState } from "react";
import { CheckCircle, UserPlus, Mail, Lock, ArrowRight, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ThankYouStepProps {
  sessionId: string | null;
  orderIds?: string[];
}

const ThankYouStep = ({ sessionId, orderIds = [] }: ThankYouStepProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsCreating(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { guest_session_id: sessionId },
        },
      });

      if (error) {
        toast.error("Could not create account", { description: error.message });
      } else {
        setAccountCreated(true);
        toast.success("Account created! Check your email to verify.");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-12 space-y-8 text-center">
      {/* Celebration header */}
      <div className="space-y-4">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <PartyPopper className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Thank You For Your Order!
        </h1>
        <p className="text-muted-foreground text-lg">
          Your order has been submitted successfully. We'll start preparing your personalised colouring book right away.
        </p>
      </div>

      {/* Order number(s) */}
      {orderIds.length > 0 && (
        <div className="bg-muted/50 border border-border rounded-2xl p-4 space-y-1">
          <p className="text-sm text-muted-foreground font-medium">
            {orderIds.length === 1 ? "Order Reference" : "Order References"}
          </p>
          {orderIds.map((id) => (
            <p key={id} className="font-mono text-sm text-foreground font-semibold">
              {id.slice(0, 8).toUpperCase()}
            </p>
          ))}
        </div>
      )}

      {/* Order confirmation details */}
      <div className="flex items-center justify-center gap-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-2xl p-4">
        <CheckCircle className="w-5 h-5 shrink-0" />
        <span>You'll receive a confirmation email shortly with your order details.</span>
      </div>

      {/* Create account card */}
      {!accountCreated ? (
        <Card className="rounded-3xl text-left">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Create an Account
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Track your order, reorder easily, and save your designs for next time.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 rounded-xl"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 rounded-xl"
                  minLength={6}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-xl"
                disabled={isCreating}
              >
                {isCreating ? "Creating…" : "Create Account"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center">
              No obligation — just makes it easier to manage your orders.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-3xl">
          <CardContent className="p-6 text-center space-y-3">
            <CheckCircle className="w-10 h-10 text-green-600 mx-auto" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Account Created!
            </h2>
            <p className="text-sm text-muted-foreground">
              Check your email to verify your account. You can track your order from your dashboard.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ThankYouStep;
