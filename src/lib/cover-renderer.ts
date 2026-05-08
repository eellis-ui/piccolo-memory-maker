/**
 * Renders front and back covers to PNG blobs by mounting the actual React
 * preview components into a hidden DOM node and capturing them with
 * html-to-image. This guarantees the PDF output matches the on-screen preview
 * pixel-for-pixel — there is no separate cover layout code to drift.
 *
 * Strategy: render the components at the same size the preview uses (~380px
 * wide), then capture at high pixelRatio so the final PNG is print-quality
 * A4 (1240×1754). Text rasterises sharp at high DPI.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { toBlob } from "html-to-image";
import FrontCoverPreview from "@/components/builder/FrontCoverPreview";
import BackCoverPage from "@/components/builder/BackCoverPage";

// Match the preview size the developer designed BackCoverPage's absolute pixel
// values around (~380px wide). The A4-ratio height keeps the output 1:1.414.
const PREVIEW_W = 380;
const PREVIEW_H = Math.round((PREVIEW_W * 297) / 210); // 537 — A4 portrait ratio
const A4_W = 1240;
const PIXEL_RATIO = A4_W / PREVIEW_W; // ~3.26 — final PNG is 1240×1754

async function captureComponent(element: React.ReactElement): Promise<Blob> {
  // Mount fully visible at the top-left corner. We can't hide the host with
  // opacity:0, visibility:hidden, off-screen positioning, or transform —
  // html-to-image's clone-and-render pipeline sees those as blank.
  //
  // Trade-off: the cover briefly appears on screen during capture (~1s).
  // We mask it with a high-z-index full-viewport white overlay so the user
  // sees a clean white screen instead of a flash of the rendered cover.
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "0";
  host.style.top = "0";
  host.style.width = `${PREVIEW_W}px`;
  host.style.height = `${PREVIEW_H}px`;
  host.style.background = "#fffaf3";
  host.style.zIndex = "999998";
  host.style.pointerEvents = "none";
  host.style.containerType = "inline-size";
  document.body.appendChild(host);

  // White full-viewport overlay on top of the host so the user doesn't see
  // the rendered cover flash while we capture it. Carries a small loading
  // hint so the brief blank moment looks intentional.
  const mask = document.createElement("div");
  mask.style.position = "fixed";
  mask.style.inset = "0";
  mask.style.background = "#fffaf3";
  mask.style.zIndex = "999999";
  mask.style.pointerEvents = "none";
  mask.style.display = "flex";
  mask.style.alignItems = "center";
  mask.style.justifyContent = "center";
  mask.style.fontFamily = "system-ui, sans-serif";
  mask.style.color = "#666";
  mask.style.fontSize = "16px";
  mask.textContent = "Preparing your book…";
  document.body.appendChild(mask);

  const root = createRoot(host);

  try {
    root.render(element);

    // Give React time to commit + run effects.
    await new Promise<void>((resolve) => setTimeout(resolve, 200));

    if (host.children.length === 0) {
      throw new Error("Cover render: React produced no DOM");
    }

    // Wait for any <img> in the tree to finish loading (or fail).
    const imgs = Array.from(host.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        });
      }),
    );

    // Wait for fonts so Bristol/Yuji Syuku resolve to their final glyphs.
    if ((document as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready) {
      try { await (document as { fonts: { ready: Promise<unknown> } }).fonts.ready; } catch { /* ignore */ }
    }

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const blob = await toBlob(host, {
      width: PREVIEW_W,
      height: PREVIEW_H,
      pixelRatio: PIXEL_RATIO,
      cacheBust: true,
      backgroundColor: "#fffaf3",
    });
    if (!blob) throw new Error("html-to-image produced no blob");
    return blob;
  } finally {
    root.unmount();
    try { document.body.removeChild(host); } catch { /* already removed */ }
    try { document.body.removeChild(mask); } catch { /* already removed */ }
  }
}

/**
 * Render the front cover to a PNG blob.
 *
 * @param _logoSrc       Unused — kept for backwards-compat with old callers.
 *                       The component imports its own logo asset.
 * @param gridImageUrls  4 URLs: [original1, lineart1, lineart2, original2]
 * @param subtitle       Upper text line (e.g. "FOR KIDS AND ADULTS ALIKE")
 * @param bottomTitle    Lower text line (e.g. "color your memories")
 */
export function renderFrontCoverPng(
  _logoSrc: string,
  gridImageUrls: (string | null)[],
  subtitle: string,
  bottomTitle: string,
): Promise<Blob> {
  return captureComponent(
    React.createElement(FrontCoverPreview, {
      gridCells: gridImageUrls,
      subtitle: subtitle.toUpperCase(),
      bottomTitle,
    }),
  );
}

/** Render the back cover to a PNG blob. Always uses BackCoverPage as-is. */
export function renderBackCoverPng(): Promise<Blob> {
  return captureComponent(React.createElement(BackCoverPage));
}
