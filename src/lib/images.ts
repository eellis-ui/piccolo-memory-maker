/**
 * Responsive image helpers for the before/after comparison images.
 *
 * Those images are 1288-1600px wide but render at roughly 115-165 CSS px.
 * Handing the browser the full-size file meant a ~10x downscale, which washed
 * the line art out to grey — at the rendered size the darkest pixel measured
 * 110/255 where the source had true black.
 *
 * `scripts/resize-images.py` emits pre-scaled derivatives next to each source
 * image (`after-family-240.webp` and so on), sharpened for line art. These
 * helpers point the browser at them.
 */

/** Widths emitted by scripts/resize-images.py. Keep the two in step. */
const DERIVATIVE_WIDTHS = [240, 360, 480] as const;

/** Builds a `srcSet` from a full-size image path. */
export function comparisonSrcSet(src: string): string {
  const base = src.replace(/\.webp$/, "");
  return DERIVATIVE_WIDTHS.map((w) => `${base}-${w}.webp ${w}w`).join(", ");
}

/**
 * Rendered width of a single comparison image. Both grids put two images plus
 * an arrow inside one column, so each lands near 130px on desktop and 170px on
 * a single-column phone. Rounded up rather than down — asking for slightly too
 * many pixels costs a few KB, asking for too few brings the blur back.
 */
export const COMPARISON_SIZES = "(min-width: 768px) 130px, 170px";
