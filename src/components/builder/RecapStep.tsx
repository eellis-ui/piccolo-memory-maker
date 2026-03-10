import { Button } from "@/components/ui/button";
import { Check, BookOpen, Download, UserPlus } from "lucide-react";
import type { OrderPhoto, BookAddOnsLocal } from "@/pages/Builder";
import logoImg from "@/assets/piccoload-logo.png";

interface RecapBook {
  index: number;
  photos: OrderPhoto[];
  bookAddOns: BookAddOnsLocal;
  coverData: {
    imageIds: [string, string];
    title: string;
    subtitle: string;
  } | null;
  digitalDownload?: boolean;
}

interface RecapStepProps {
  books: RecapBook[];
  onContinueToCheckout: () => void;
  onEditBook: (bookIndex: number) => void;
  hasAnyDigitalDownload?: boolean;
}

const RecapStep = ({ books, onContinueToCheckout, onEditBook, hasAnyDigitalDownload }: RecapStepProps) => {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
          <Check className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Your Books Are Ready!
        </h2>
        <p className="text-muted-foreground mt-1">
          Here's a recap of all the books in your order
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {books.map((book) => {
          const photo1 = book.coverData
            ? book.photos.find((p) => p.id === book.coverData!.imageIds[0])
            : null;
          const photo2 = book.coverData
            ? book.photos.find((p) => p.id === book.coverData!.imageIds[1])
            : null;

          const gridCells = [
            photo1?.originalUrl ?? null,
            photo1?.convertedUrl ?? null,
            photo2?.convertedUrl ?? null,
            photo2?.originalUrl ?? null,
          ];

          const subtitle =
            book.bookAddOns.dedicationPageEnabled && book.bookAddOns.dedicationPageText.trim()
              ? book.bookAddOns.dedicationPageText.trim().toUpperCase()
              : "FOR KIDS AND ADULTS ALIKE";

          return (
            <div
              key={book.index}
              className="rounded-2xl border-2 border-border bg-background p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-foreground text-sm">
                    Book {book.index + 1}
                  </span>
                </div>
                <button
                  onClick={() => onEditBook(book.index)}
                  className="text-xs text-primary hover:underline"
                >
                  Edit
                </button>
              </div>

              {/* Mini cover preview */}
              <div className="bg-[#fffaf3] rounded-lg p-3 shadow-soft">
                <div
                  className="relative bg-[#fffaf3] overflow-hidden flex flex-col"
                  style={{ aspectRatio: "3 / 4" }}
                >
                  <div className="flex-1 flex items-center justify-center min-h-0">
                    <img
                      src={logoImg}
                      alt="Piccoload"
                      style={{ width: "50%" }}
                    />
                  </div>

                  <div
                    className="shrink-0 grid grid-cols-2"
                    style={{ margin: "0 8.75%", gap: 0 }}
                  >
                    {gridCells.map((url, idx) => (
                      <div key={idx} className="aspect-square overflow-hidden bg-[#ede8e0]">
                        {url ? (
                          <img
                            src={url}
                            alt={`Cover ${idx + 1}`}
                            className="w-full h-full object-cover object-center"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted" />
                        )}
                      </div>
                    ))}
                  </div>

                  <div
                    className="flex-1 flex flex-col justify-start min-h-0"
                    style={{ paddingRight: "8.75%" }}
                  >
                    <div className="flex flex-col items-end" style={{ paddingTop: "2.5%" }}>
                      <p
                        className="uppercase text-foreground leading-none"
                        style={{
                          fontFamily: "'Yuji Syuku', serif",
                          fontSize: "clamp(6px, 1.4vw, 10px)",
                          letterSpacing: 0,
                        }}
                      >
                        {subtitle}
                      </p>
                      <p
                        className="leading-none"
                        style={{
                          fontFamily: "Bristol, serif",
                          fontSize: "clamp(7px, 1.6vw, 12px)",
                          marginTop: "2.5%",
                          color: "hsl(var(--foreground))",
                        }}
                      >
                        {book.bookAddOns.bottomTitle || "color your memories"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {book.photos.length} pages
                {book.bookAddOns.dedicationPageEnabled && " · Custom cover text"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center pt-4">
        <Button onClick={onContinueToCheckout} className="rounded-2xl px-10 text-base">
          Checkout
        </Button>
      </div>
    </div>
  );
};

export default RecapStep;
