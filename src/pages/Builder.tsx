import { useState, useEffect } from "react";
import { Check, BookOpen, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBasket } from "@/contexts/BasketContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import UploadStep, { type LocalImage } from "@/components/builder/UploadStep";
import ApproveStep from "@/components/builder/ApproveStep";
import CoverStep from "@/components/builder/CoverStep";
import CheckoutStep from "@/components/builder/CheckoutStep";
import UniquePhotosUpsellBanner from "@/components/builder/UniquePhotosUpsellBanner";

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

export interface BookAddOnsLocal {
  dedicationPageEnabled: boolean;
  dedicationPageText: string;
  bottomTitle: string;
}

interface BookState {
  orderId: string | null;
  step: BuilderStep;
  photos: OrderPhoto[];
  uploadImages: LocalImage[];
  bookAddOns: BookAddOnsLocal;
  digitalDownload: boolean;
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
  const { item, addOns, uniquePhotos } = useBasket();
  const bookCount = item?.quantity ?? 1;

  // Each book has independent state; checkout is a shared final step
  const [books, setBooks] = useState<BookState[]>([]);
  const [activeBookIndex, setActiveBookIndex] = useState(0);
  const [showingCheckout, setShowingCheckout] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Auth check + create order records (only runs once on mount)
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (initialized) return;
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
          uploadImages: [],
          bookAddOns: { dedicationPageEnabled: false, dedicationPageText: "", bottomTitle: "color your memories" },
          digitalDownload: false,
          coverData: null,
          completed: false,
        });
      }
      setBooks(newBooks);
      setInitialized(true);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateBook = (index: number, patch: Partial<BookState>) => {
    setBooks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const activeBook = books[activeBookIndex];

  // ── Step handlers for the active book ──────────────────────────────────────
  const handleImagesUploaded = (newPhotos: OrderPhoto[]) => {
    // Merge with existing conversion data so going back to upload doesn't wipe conversions
    const mergeWithExisting = (existingPhotos: OrderPhoto[]) => {
      const existingMap = new Map(existingPhotos.map((p) => [p.id, p]));
      return newPhotos.map((np) => {
        const existing = existingMap.get(np.id);
        if (existing && existing.convertedUrl) {
          return {
            ...np,
            convertedUrl: existing.convertedUrl,
            convertedPath: existing.convertedPath,
            conversionStatus: existing.conversionStatus,
            isApproved: existing.isApproved,
          };
        }
        return np;
      });
    };

    if (!uniquePhotos && bookCount > 1) {
      setBooks((prev) =>
        prev.map((b) => ({ ...b, photos: mergeWithExisting(b.photos), step: "approve" as const }))
      );
    } else {
      const merged = mergeWithExisting(books[activeBookIndex].photos);
      updateBook(activeBookIndex, { photos: merged, step: "approve" });
    }
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

          {/* ── Multi-book tabs (only when unique photos and not at checkout) ── */}
          {bookCount > 1 && uniquePhotos && !showingCheckout && (
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
              {bookCount > 1 && uniquePhotos && (
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
                {/* Unique photos upsell — shown only on upload step for multi-book orders */}
                {activeBook.step === "upload" && bookCount > 1 && (
                  <div className="mb-6">
                    <UniquePhotosUpsellBanner />
                  </div>
                )}

                {activeBook.step === "upload" && activeBook.orderId && (
                  <UploadStep
                    key={`upload-${activeBookIndex}`}
                    orderId={activeBook.orderId}
                    onImagesUploaded={handleImagesUploaded}
                    maxImages={20}
                    initialImages={activeBook.uploadImages}
                    onImagesChanged={(imgs) => updateBook(activeBookIndex, { uploadImages: imgs })}
                  />
                )}

                {activeBook.step === "approve" && activeBook.orderId && (
                  <ApproveStep
                    key={`approve-${activeBook.orderId}`}
                    orderId={activeBook.orderId}
                    photos={activeBook.photos}
                    onApprovalComplete={handleApprovalComplete}
                    onPhotosChange={(photos) => updateBook(activeBookIndex, { photos })}
                    onBack={() => updateBook(activeBookIndex, { step: "upload" })}
                  />
                )}

                {activeBook.step === "cover" && (
                  <CoverStep
                    key={`cover-${activeBookIndex}`}
                    availableImages={activeBook.photos.map((p) => ({
                      id: p.id,
                      originalUrl: p.originalUrl,
                      convertedUrl: p.convertedUrl,
                    }))}
                    bookAddOns={activeBook.bookAddOns}
                    onBookAddOnsChange={(a) => updateBook(activeBookIndex, { bookAddOns: a })}
                    onCoverComplete={handleCoverComplete}
                    onBack={() => updateBook(activeBookIndex, { step: "approve" })}
                  />
                )}
              </>
            )}

            {showingCheckout && (
              <CheckoutStep
                pageCount={books[0].photos.length}
                extraPages={0}
                convertedUrls={books[0].photos.map((p) => p.convertedUrl)}
                bookDigitalDownloads={books.map((b, i) => ({ bookIndex: i, enabled: b.digitalDownload }))}
                onToggleBookDigitalDownload={(bookIndex) =>
                  updateBook(bookIndex, { digitalDownload: !books[bookIndex].digitalDownload })
                }
                bookAddOnsList={books.map((b, i) => ({
                  bookIndex: i,
                  titlePageEnabled: b.bookAddOns.bottomTitle !== "color your memories",
                  dedicationPageEnabled: b.bookAddOns.dedicationPageEnabled,
                }))}
                onBack={() => {
                  setShowingCheckout(false);
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
