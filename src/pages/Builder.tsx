import { useState, useEffect } from "react";
import { Check, BookOpen, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBasket } from "@/contexts/BasketContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import UploadStep from "@/components/builder/UploadStep";
import ApproveStep from "@/components/builder/ApproveStep";
import CoverStep from "@/components/builder/CoverStep";
import CheckoutStep from "@/components/builder/CheckoutStep";

type BuilderStep = "upload" | "approve" | "cover" | "checkout";

export interface OrderPhoto {
  id: string;
  originalPath: string;
  convertedPath: string | null;
  pagePosition: number;
  isApproved: boolean;
  conversionStatus: string;
  originalUrl: string;
  convertedUrl: string | null;
  isLandscape: boolean;
}

interface BookState {
  orderId: string | null;
  step: BuilderStep;
  photos: OrderPhoto[];
  coverData: {
    imageIds: [string, string];
    title: string;
    subtitle: string;
  } | null;
  completed: boolean;
}

const BUILDER_STEPS: { key: BuilderStep; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "approve", label: "Approve" },
  { key: "cover", label: "Cover" },
  { key: "checkout", label: "Checkout" },
];

const Builder = () => {
  const navigate = useNavigate();
  const { item, addOns } = useBasket();
  const bookCount = item?.quantity ?? 1;

  // Each book has independent state; checkout is a shared final step
  const [books, setBooks] = useState<BookState[]>([]);
  const [activeBookIndex, setActiveBookIndex] = useState(0);
  const [showingCheckout, setShowingCheckout] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Auth check + create order records
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);

      // Create one order record per book
      const newBooks: BookState[] = [];
      for (let i = 0; i < bookCount; i++) {
        const { data, error } = await supabase
          .from("orders")
          .insert({ status: "draft", user_id: user.id })
          .select("id")
          .single();
        newBooks.push({
          orderId: error ? null : data.id,
          step: "upload",
          photos: [],
          coverData: null,
          completed: false,
        });
      }
      setBooks(newBooks);
    };
    init();
  }, [navigate, bookCount]);

  const updateBook = (index: number, patch: Partial<BookState>) => {
    setBooks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const activeBook = books[activeBookIndex];

  // ── Step handlers for the active book ──────────────────────────────────────
  const handleImagesUploaded = (photos: OrderPhoto[]) => {
    updateBook(activeBookIndex, { photos, step: "approve" });
  };

  const handleApprovalComplete = (photos: OrderPhoto[]) => {
    updateBook(activeBookIndex, { photos, step: "cover" });
  };

  const handleCoverComplete = async (data: {
    imageIds: [string, string];
    title: string;
    subtitle: string;
  }) => {
    const book = books[activeBookIndex];
    if (book.orderId) {
      await supabase
        .from("orders")
        .update({
          cover_image_id: data.imageIds[0],
          title_page_enabled: addOns.titlePageEnabled,
          title_page_text: addOns.titlePageText,
          dedication_page_enabled: addOns.dedicationPageEnabled,
          dedication_page_text: addOns.dedicationPageText,
        })
        .eq("id", book.orderId);
    }

    updateBook(activeBookIndex, { coverData: data, completed: true, step: "cover" });

    // Move to next incomplete book, or go to checkout
    const nextIncomplete = books.findIndex((b, i) => i !== activeBookIndex && !b.completed);
    if (nextIncomplete !== -1) {
      setActiveBookIndex(nextIncomplete);
    } else {
      setShowingCheckout(true);
    }
  };

  // Step index for progress bar
  const currentStepIndex = activeBook
    ? BUILDER_STEPS.findIndex((s) => s.key === activeBook.step)
    : 0;

  if (books.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Multi-book tabs (only when ordering >1 book and not at checkout) ── */}
          {bookCount > 1 && !showingCheckout && (
            <div className="max-w-2xl mx-auto mb-8">
              <div className="flex gap-2 p-1 bg-muted rounded-2xl">
                {books.map((book, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveBookIndex(i)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                      activeBookIndex === i
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {book.completed ? (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    ) : (
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>Book {i + 1}</span>
                    {book.completed && (
                      <span className="text-[10px] text-primary font-semibold">✓</span>
                    )}
                  </button>
                ))}
              </div>
              {/* Progress hint */}
              <p className="text-xs text-center text-muted-foreground mt-2">
                {books.filter((b) => b.completed).length} of {bookCount} books ready
                {books.every((b) => b.completed) && " — proceed to checkout!"}
              </p>
            </div>
          )}

          {/* ── Progress Steps (per book) ── */}
          {!showingCheckout && (
            <div className="max-w-2xl mx-auto mb-12">
              <div className="flex items-center justify-between">
                {BUILDER_STEPS.filter((s) => s.key !== "checkout").map((step, index) => (
                  <div key={step.key} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                          index < currentStepIndex
                            ? "bg-primary text-primary-foreground"
                            : index === currentStepIndex
                            ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index < currentStepIndex ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span
                        className={`mt-2 text-sm ${
                          index <= currentStepIndex
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < BUILDER_STEPS.filter((s) => s.key !== "checkout").length - 1 && (
                      <div
                        className={`w-16 sm:w-24 h-0.5 mx-2 ${
                          index < currentStepIndex ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Book label under progress bar */}
              {bookCount > 1 && (
                <p className="text-center text-sm text-muted-foreground mt-4 flex items-center justify-center gap-1.5">
                  <Copy className="w-3.5 h-3.5" />
                  Customising{" "}
                  <span className="font-semibold text-foreground">
                    Book {activeBookIndex + 1} of {bookCount}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* ── Step Content ── */}
          <div className="max-w-5xl mx-auto">
            {!showingCheckout && activeBook && (
              <>
                {activeBook.step === "upload" && activeBook.orderId && (
                  <UploadStep
                    orderId={activeBook.orderId}
                    onImagesUploaded={handleImagesUploaded}
                    maxImages={20}
                  />
                )}

                {activeBook.step === "approve" && activeBook.orderId && (
                  <ApproveStep
                    orderId={activeBook.orderId}
                    photos={activeBook.photos}
                    onApprovalComplete={handleApprovalComplete}
                    onBack={() => updateBook(activeBookIndex, { step: "upload" })}
                  />
                )}

                {activeBook.step === "cover" && (
                  <CoverStep
                    availableImages={activeBook.photos.map((p) => ({
                      id: p.id,
                      originalUrl: p.originalUrl,
                      convertedUrl: p.convertedUrl,
                    }))}
                    onCoverComplete={handleCoverComplete}
                    onBack={() => updateBook(activeBookIndex, { step: "approve" })}
                  />
                )}
              </>
            )}

            {showingCheckout && (
              <CheckoutStep
                pageCount={books[0].photos.length}
                hasUniquePhotos={false}
                extraPages={0}
                convertedUrls={books[0].photos.map((p) => p.convertedUrl)}
                onBack={() => {
                  setShowingCheckout(false);
                  // Go back to last book's cover step
                  setActiveBookIndex(bookCount - 1);
                  updateBook(bookCount - 1, { completed: false, step: "cover" });
                }}
              />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Builder;
