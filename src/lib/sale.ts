/**
 * Single source of truth for the name of the current promotion.
 *
 * The name is derived from the month so it never needs a manual edit. It had
 * previously been hardcoded in four places, which drifted apart: the cart and
 * order review still said "February Sale" and the landing banner said "Spring
 * Sale" while the pricing block correctly said "July Sale".
 *
 * Month names are listed explicitly rather than read from
 * `toLocaleString("default", { month: "long" })`, which resolves against the
 * visitor's own locale — a French browser would have rendered "juillet Sale".
 *
 * Callers render this inside elements that already apply `uppercase`, so the
 * value is returned in title case.
 */
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** e.g. "July Sale". Pass a date to test; defaults to now. */
export function getSaleName(date: Date = new Date()): string {
  return `${MONTH_NAMES[date.getMonth()]} Sale`;
}
