import { Truck } from "lucide-react";

// Matches the published FAQ: 3–5 business days printing + 3–5 business days
// US shipping. If ops timings change, change them here AND in the FAQ.
const MIN_BUSINESS_DAYS = 6;
const MAX_BUSINESS_DAYS = 10;

const addBusinessDays = (from: Date, days: number) => {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
};

const fmt = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

/**
 * Concrete delivery promise beside the CTA, so gift buyers don't have to dig
 * the timeline out of the FAQ accordion.
 */
const DeliveryEstimate = () => {
  const today = new Date();
  const earliest = addBusinessDays(today, MIN_BUSINESS_DAYS);
  const latest = addBusinessDays(today, MAX_BUSINESS_DAYS);

  return (
    <div className="flex items-center justify-center gap-2 mt-3 text-sm text-foreground">
      <Truck className="w-4 h-4 text-primary shrink-0" />
      <span>
        Order today — <strong>arrives {fmt(earliest)} – {fmt(latest)}</strong>
        <span className="text-muted-foreground"> · Free US shipping included</span>
      </span>
    </div>
  );
};

export default DeliveryEstimate;
