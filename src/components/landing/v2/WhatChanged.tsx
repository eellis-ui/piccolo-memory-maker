import { useState, createContext, useContext, type ReactNode } from "react";
import { Pencil, X } from "lucide-react";

const AnnotateContext = createContext(false);

export const useAnnotations = () => useContext(AnnotateContext);

/** Wraps a changed block; shows a numbered marker when annotations are on. */
export const Annotated = ({ n, label, children }: { n: number; label: string; children: ReactNode }) => {
  const on = useAnnotations();
  return (
    <div className={`relative ${on ? "outline outline-2 outline-offset-4 outline-primary/50 rounded-lg" : ""}`}>
      {on && (
        <span className="absolute -top-3 -left-2 z-40 bg-primary text-primary-foreground text-[11px] font-bold px-2 py-0.5 rounded-full shadow whitespace-nowrap">
          {n}. {label}
        </span>
      )}
      {children}
    </div>
  );
};

const CHANGES = [
  "Sticky mobile add-to-cart (was built, never rendered)",
  "Honest countdown — real weekly print-run cutoff",
  "Guarantee badge now matches the refund policy",
  "“Try it with your photo” interactive preview",
  "Photo-first review wall + review schema",
  "Delivery date promise beside the CTA",
  "Flip-through video slot in the gallery",
  "CTA verb: “Start My Book” instead of “Add to Cart”",
  "Gift lane: free gift note + gift-card path",
];

/**
 * Team-demo helper: floating toggle that outlines and numbers every change
 * on the page. Not part of the production design — delete before launch.
 */
export const WhatChangedProvider = ({ children }: { children: ReactNode }) => {
  const [on, setOn] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <AnnotateContext.Provider value={on}>
      {children}
      <div className="fixed bottom-4 left-4 z-[60] flex flex-col items-start gap-2">
        {open && (
          <div className="bg-foreground text-background rounded-xl shadow-xl p-4 max-w-xs text-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold">What changed on this page</p>
              <button onClick={() => setOpen(false)} aria-label="Close change list">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-xs opacity-90">
              {CHANGES.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
            <label className="flex items-center gap-2 mt-3 text-xs cursor-pointer">
              <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} />
              Highlight changes on the page
            </label>
          </div>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          className="bg-foreground text-background rounded-full px-4 py-2 text-xs font-bold shadow-lg flex items-center gap-1.5"
        >
          <Pencil className="w-3.5 h-3.5" />
          What changed?
        </button>
      </div>
    </AnnotateContext.Provider>
  );
};
