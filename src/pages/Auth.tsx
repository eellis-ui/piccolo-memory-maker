import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || "/my-orders";
  const { user, loading } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [signupHint, setSignupHint] = useState("");

  // If already logged in (or just signed in), redirect
  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true });
    }
  }, [user, loading, from, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (forgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Check your email for a password reset link!");
        setForgotPassword(false);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in successfully!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account!");
      }
    } catch (err: any) {
      if (isLogin && err.message === "Invalid login credentials") {
        setIsLogin(false);
        setSignupHint("No account found with that email — create one below.");
      } else {
        toast.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render the form while redirecting (user is set)
  if (user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 flex items-center justify-center">
        <Card className="w-full max-w-md rounded-3xl">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">
              {forgotPassword ? "Reset Password" : isLogin ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {forgotPassword
                ? "Enter your email and we'll send you a reset link"
                : isLogin
                  ? "Sign in to access your coloring books"
                  : "Sign up to start creating your coloring book"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signupHint && (
              <div className="mb-4 p-3 rounded-xl bg-primary/10 text-primary text-sm text-center font-medium">
                {signupHint}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="rounded-xl"
                />
              </div>
              {!forgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="rounded-xl"
                  />
                </div>
              )}
              <Button type="submit" className="w-full rounded-2xl" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {forgotPassword ? "Send Reset Link" : isLogin ? "Sign In" : "Sign Up"}
              </Button>
            </form>
            <div className="mt-4 text-center space-y-2">
              {isLogin && !forgotPassword && (
                <button
                  onClick={() => setForgotPassword(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors block mx-auto"
                >
                  Forgot your password?
                </button>
              )}
              <button
                onClick={() => { setIsLogin(!isLogin); setForgotPassword(false); setSignupHint(""); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {forgotPassword
                  ? "Back to Sign In"
                  : isLogin
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Auth;
