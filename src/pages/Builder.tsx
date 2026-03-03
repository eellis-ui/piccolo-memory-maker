import { useState, useEffect, useCallback } from "react";
import { Check, BookOpen, Copy, Link2, Sparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useBasket } from "@/contexts/BasketContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import UploadStep, { type LocalImage } from "@/components/builder/UploadStep";
import ApproveStep from "@/components/builder/ApproveStep";
import CoverStep from "@/components/builder/CoverStep";
import CheckoutStep from "@/components/builder/CheckoutStep";
import UniquePhotosUpsellBanner from "@/components/builder/UniquePhotosUpsellBanner";
import {
  getOrCreateSessionId,
  createGuestOrders,
  getSessionOrders,
  updateGuestOrder,
} from "@/lib/guest-api";

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
  const [searchParams] = useSearchParams();
  const resumeSessionId = searchParams.get("sessionId");

  const { item, items, addOns, uniquePhotos, totalBookCount, addToCart, clear, setActiveSessionId } = useBasket();
  const bookCount = item?.quantity ?? 1;

  const [books, setBooks] = useState<BookState[]>([]);
  const [activeBookIndex, setActiveBookIndex] = useState(0);
  const [showingCheckout, setShowingCheckout] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Save step to DB whenever it changes
  const persistStep = useCallback(async (orderId: string, step: BuilderStep) => {
    const sid = sessionId || getOrCreateSessionId();
    await updateGuestOrder(sid, orderId, { builder_step: step });
  }, [sessionId]);

  useEffect(() => {
    if (initialized) return;
    const init = async () => {
      // ── Resume existing session ──
      // Check URL param first, then localStorage fallback
      const storedSessionId = localStorage.getItem("guest_session_id");
      const sid = resumeSessionId || storedSessionId || getOrCreateSessionId();
      setSessionId(sid);
      setActiveSessionId(sid);

      // Always keep sessionId in the URL so refreshing works
      if (!resumeSessionId && sid) {
        const newParams = new URLSearchParams(window.location.search);
        newParams.set("sessionId", sid);
        window.history.replaceState(null, "", `${window.location.pathname}?${newParams.toString()}`);
      }

      if (sid) {
        try {
          const existingOrders = await getSessionOrders(sid);

          if (existingOrders && existingOrders.length > 0) {
            // Always reconstruct basket from DB — in-memory basket resets on refresh
            clear();
            // Reconstruct as individual single-book items (one per DB order)
            existingOrders.forEach((order: any) => {
              addToCart(1, { uniquePhotos: !!order.unique_photos });
            });

            const restoredBooks: BookState[] = existingOrders.map((order: any) => {
              const photos: OrderPhoto[] = (order.photos || []).map((row: any) => ({
                id: row.id,
                originalPath: row.original_path,
                convertedPath: row.converted_path,
                pagePosition: row.page_position,
                isApproved: row.is_approved,
                conversionStatus: row.conversion_status,
                originalUrl: row.originalUrl || "",
                convertedUrl: row.convertedUrl || null,
                isLandscape: row.is_landscape,
              }));

              const step = (order.builder_step || "upload") as BuilderStep;
              const isCompleted = step === "cover" && !!order.cover_image_id;

              return {
                orderId: order.id,
                step,
                photos,
                uploadImages: [] as LocalImage[],
                bookAddOns: {
                  dedicationPageEnabled: order.dedication_page_enabled,
                  dedicationPageText: order.dedication_page_text || "",
                  bottomTitle: order.title_page_text === "My Piccolo'd Colouring Book" ? "color your memories" : order.title_page_text,
                },
                digitalDownload: false,
                coverData: isCompleted ? { imageIds: [order.cover_image_id, order.cover_image_id], title: order.title_page_text, subtitle: "" } : null,
                completed: isCompleted,
              } as BookState;
            });

            setBooks(restoredBooks);

            if (restoredBooks.every((b) => b.completed)) {
              setShowingCheckout(true);
            }

            setInitialized(true);
            return;
          }
        } catch (err) {
          console.error("Failed to resume session:", err);
        }
      }

      // ── Create new session (only if no existing session was found) ──
      // If we had a sessionId from URL or localStorage but got 0 orders,
      // reuse that sid rather than creating a brand-new one (avoids ghost drafts).
      try {
        const newSessionId = crypto.randomUUID();
        setSessionId(newSessionId);
        setActiveSessionId(newSessionId);
        localStorage.setItem("guest_session_id", newSessionId);

        // Update URL with new session ID so refresh works
        const newParams = new URLSearchParams(window.location.search);
        newParams.set("sessionId", newSessionId);
        window.history.replaceState(null, "", `${window.location.pathname}?${newParams.toString()}`);

        // bookCount may be 1 if basket was reset on refresh — that's fine for a brand-new session
        const orders = await createGuestOrders(newSessionId, Math.max(bookCount, 1));

        const newBooks: BookState[] = orders.map((o) => ({
          orderId: o.id,
          step: "upload" as const,
          photos: [],
          uploadImages: [],
          bookAddOns: { dedicationPageEnabled: false, dedicationPageText: "", bottomTitle: "color your memories" },
          digitalDownload: false,
          coverData: null,
          completed: false,
        }));
        setBooks(newBooks);
      } catch (err) {
        console.error("Failed to create orders:", err);
      }
      setInitialized(true);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateBook = (index: number, patch: Partial<BookState>) => {
    setBooks((prev) => prev.map((b, i) => {
      if (i !== index) return b;
      const updated = { ...b, ...patch };
      if (patch.step && b.orderId) {
        persistStep(b.orderId, patch.step);
      }
      return updated;
    }));
  };

  const activeBook = books[activeBookIndex];

  // ── Step handlers ──
  const handleImagesUploaded = (newPhotos: OrderPhoto[]) => {
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
        prev.map((b) => {
          const merged = mergeWithExisting(b.photos);
          if (b.orderId) persistStep(b.orderId, "approve");
          return { ...b, photos: merged, step: "approve" as const };
        })
      );
    } else {
      const merged = mergeWithExisting(books[activeBookIndex].photos);
      updateBook(activeBookIndex, { photos: merged, step: "approve" });
    }
  };

  const handleApprovalComplete = (photos: OrderPhoto[]) => {
    if (!uniquePhotos && bookCount > 1) {
      // Sync approved photos to all books in shared mode
      setBooks((prev) =>
        prev.map((b) => ({ ...b, photos, step: "cover" as const }))
      );
    } else {
      updateBook(activeBookIndex, { photos, step: "cover" });
    }
  };

  const handleCoverComplete = async (data: {
    imageIds: [string, string];
    title: string;
    subtitle: string;
  }) => {
    const book = books[activeBookIndex];
    if (book.orderId && sessionId) {
      await updateGuestOrder(sessionId, book.orderId, {
        cover_image_id: data.imageIds[0],
        title_page_enabled: addOns.titlePageEnabled,
        title_page_text: addOns.titlePageText,
        dedication_page_enabled: addOns.dedicationPageEnabled,
        dedication_page_text: addOns.dedicationPageText,
        builder_step: "cover",
      });
    }

    // In shared-photos mode all books use the same cover — mark all complete at once
    if (!uniquePhotos && bookCount > 1) {
      setBooks((prev) =>
        prev.map((b, i) => {
          const isActive = i === activeBookIndex;
          // Persist cover for every non-active book too
          if (!isActive && b.orderId && sessionId) {
            updateGuestOrder(sessionId, b.orderId, {
              cover_image_id: data.imageIds[0],
              title_page_enabled: addOns.titlePageEnabled,
              title_page_text: addOns.titlePageText,
              dedication_page_enabled: addOns.dedicationPageEnabled,
              dedication_page_text: addOns.dedicationPageText,
              builder_step: "cover",
            });
          }
          return { ...b, coverData: data, completed: true, step: "cover" as const };
        })
      );
      setShowingCheckout(true);
      return;
    }

    updateBook(activeBookIndex, { coverData: data, completed: true, step: "cover" });

    const nextIncomplete = books.findIndex((b, i) => i !== activeBookIndex && !b.completed);
    if (nextIncomplete !== -1) {
      setActiveBookIndex(nextIncomplete);
    } else {
      setShowingCheckout(true);
    }
  };

  const currentStepIndex = activeBook
    ? BUILDER_STEPS.findIndex((s) => s.key === activeBook.step)
    : 0;

  if (books.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Setting up your book…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Multi-book tabs ── */}
          {bookCount > 1 && !showingCheckout && (() => {
            // Expand basket items (bundles) into per-book uniquePhotos flags
            const perBookUnique: boolean[] = [];
            items.forEach((basketItem) => {
              for (let q = 0; q < basketItem.quantity; q++) {
                perBookUnique.push(basketItem.uniquePhotos);
              }
            });

            // Build groups: consecutive books with same shared/unique status
            const groups: { start: number; end: number; unique: boolean }[] = [];
            books.forEach((_, i) => {
              const isUnique = perBookUnique[i] ?? false;
              const last = groups[groups.length - 1];
              if (last && last.unique === isUnique && !isUnique) {
                last.end = i;
              } else {
                groups.push({ start: i, end: i, unique: isUnique });
              }
            });

            return (
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
                    </button>
                  ))}
                </div>

                {/* Shared / unique photo grouping brackets */}
                <div className="flex gap-2 px-1 mt-1.5">
                  {groups.map((group, gi) => {
                    const span = group.end - group.start + 1;
                    const widthPercent = `${(span / books.length) * 100}%`;

                    if (group.unique) {
                      return (
                        <div key={gi} className="flex flex-col items-center" style={{ width: widthPercent }}>
                          <Sparkles className="w-3 h-3 text-primary" />
                          <span className="text-[10px] text-primary font-medium">Unique</span>
                        </div>
                      );
                    }

                    if (span === 1) {
                      return (
                        <div key={gi} className="flex flex-col items-center" style={{ width: widthPercent }}>
                          <Link2 className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Shared</span>
                        </div>
                      );
                    }

                    return (
                      <div key={gi} className="flex flex-col items-center" style={{ width: widthPercent }}>
                        <div className="w-full px-2">
                          <div className="border-b-2 border-x-2 border-muted-foreground/30 rounded-b-lg h-2" />
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Link2 className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Shared photos</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-center text-muted-foreground mt-2">
                  {books.filter((b) => b.completed).length} of {bookCount} books ready
                  {books.every((b) => b.completed) && " — proceed to checkout!"}
                </p>
              </div>
            );
          })()}

          {/* ── Progress Steps ── */}
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
                            : "text-foreground"
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
                {activeBook.step === "upload" && bookCount > 1 && (
                  <div className="mb-6">
                    <UniquePhotosUpsellBanner />
                  </div>
                )}

                {activeBook.step === "upload" && activeBook.orderId && sessionId && (
                  <UploadStep
                    key={`upload-${activeBookIndex}`}
                    orderId={activeBook.orderId}
                    sessionId={sessionId}
                    onImagesUploaded={handleImagesUploaded}
                    maxImages={20}
                    initialImages={activeBook.uploadImages}
                    onImagesChanged={(imgs) => updateBook(activeBookIndex, { uploadImages: imgs })}
                    sharedBookCount={!uniquePhotos && bookCount > 1 ? bookCount : undefined}
                  />
                )}

                {activeBook.step === "approve" && activeBook.orderId && sessionId && (
                  <ApproveStep
                    key={`approve-${activeBook.orderId}`}
                    orderId={activeBook.orderId}
                    sessionId={sessionId}
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
                    sharedBookCount={!uniquePhotos && bookCount > 1 ? bookCount : undefined}
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
