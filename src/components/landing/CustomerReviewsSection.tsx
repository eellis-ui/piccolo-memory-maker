import { useState, useEffect } from "react";
import { Star, CheckCircle, ChevronDown, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// Baseline numbers from legacy Judge.me data (existing reviews before DB)
const BASELINE_TOTAL = 3947;
const BASELINE_DISTRIBUTION = { 5: 3809, 4: 85, 3: 52, 2: 1, 1: 0 };

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  is_verified: boolean;
  created_at: string;
}

const Stars = ({ count, size = "sm" }: { count: number; size?: "sm" | "lg" | "interactive" }) => {
  const sizeClass = size === "lg" ? "w-5 h-5" : "w-4 h-4";
  return (
    <div className="flex">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`${sizeClass} ${i < count ? "fill-foreground text-foreground" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
};

const InteractiveStars = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              star <= (hover || value)
                ? "fill-foreground text-foreground"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const CustomerReviewsSection = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formText, setFormText] = useState("");

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    console.log("[Reviews] Fetching reviews...");
    try {
      const fetchPromise = supabase
        .from("reviews")
        .select("id, reviewer_name, rating, review_text, is_verified, created_at")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .then((res) => res);

      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error("Fetch timeout") }), 5000)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      if (error) throw error;
      console.log("[Reviews] Fetched", data?.length, "reviews");
      setReviews((data as Review[]) || []);
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formText.trim()) {
      toast.error("Please fill in your name and review");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        reviewer_name: formName.trim(),
        email: formEmail.trim() || null,
        rating: formRating,
        review_text: formText.trim(),
        is_verified: false,
        is_approved: true,
      });
      if (error) throw error;
      toast.success("Thank you for your review! 🎉");
      setFormName("");
      setFormEmail("");
      setFormRating(5);
      setFormText("");
      setShowForm(false);
      fetchReviews();
    } catch (err) {
      console.error("Failed to submit review:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate stats: baseline + DB reviews
  const dbDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) {
      dbDistribution[r.rating as keyof typeof dbDistribution]++;
    }
  });

  const starDistribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count:
      BASELINE_DISTRIBUTION[stars as keyof typeof BASELINE_DISTRIBUTION] +
      dbDistribution[stars as keyof typeof dbDistribution],
  }));

  const totalReviews = BASELINE_TOTAL + reviews.length;
  const totalWeighted =
    starDistribution.reduce((sum, d) => sum + d.stars * d.count, 0);
  const overallRating = totalReviews > 0 ? (totalWeighted / totalReviews) : 0;
  const maxCount = Math.max(...starDistribution.map((d) => d.count));

  const visibleReviews = showAll ? reviews : reviews.slice(0, 5);

  return (
    <section className="py-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
      <h3 className="font-display text-xl font-semibold text-foreground mb-6 text-center">
        Customer Reviews
      </h3>

      {/* Summary */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-4">
            <div className="text-center sm:text-left">
              <div className="text-3xl font-bold text-foreground">
                {overallRating.toFixed(2)}
              </div>
              <Stars count={Math.round(overallRating)} size="lg" />
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-primary" />
              Based on {totalReviews.toLocaleString()} reviews
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "Write a Review"}
          </Button>
        </div>

        {/* Star distribution bars */}
        <div className="space-y-2">
          {starDistribution.map((d) => (
            <div key={d.stars} className="flex items-center gap-3 text-sm">
              <span className="w-12 text-right text-muted-foreground">
                {d.stars} star
              </span>
              <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{
                    width: `${maxCount ? (d.count / maxCount) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="w-12 text-muted-foreground text-right">
                {d.count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Write a Review Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h4 className="font-display text-lg font-semibold text-foreground mb-4">
            Write a Review
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Your Rating</Label>
              <InteractiveStars value={formRating} onChange={setFormRating} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reviewName">Name *</Label>
                <Input
                  id="reviewName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Your name"
                  required
                  maxLength={100}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewEmail">Email (optional)</Label>
                <Input
                  id="reviewEmail"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="you@example.com"
                  maxLength={255}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewText">Your Review *</Label>
              <Textarea
                id="reviewText"
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                placeholder="Tell us about your experience..."
                required
                maxLength={1000}
                rows={4}
                className="rounded-xl resize-none"
              />
            </div>
            <Button
              type="submit"
              className="rounded-xl"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit Review
            </Button>
          </form>
        </div>
      )}

      {/* Individual reviews */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No reviews yet — be the first!</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {visibleReviews.map((review) => (
              <div
                key={review.id}
                className="bg-card border border-border rounded-lg p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      {review.reviewer_name}
                    </span>
                    {review.is_verified && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                <Stars count={review.rating} />
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {review.review_text}
                </p>
              </div>
            ))}
          </div>

          {reviews.length > 5 && !showAll && (
            <div className="text-center mt-6">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setShowAll(true)}
              >
                <ChevronDown className="w-4 h-4 mr-2" />
                Show All {reviews.length} Reviews
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default CustomerReviewsSection;
