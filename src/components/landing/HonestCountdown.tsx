import { useState, useEffect } from "react";

// Weekly print-run cutoff: Friday 12:00 (visitor's local time).
// ⚠ TEAM NOTE: set these to the real production cutoff before launch — the
// whole point of this component is that the deadline it shows is true.
const CUTOFF_DAY = 5; // Friday
const CUTOFF_HOUR = 12;

const getNextCutoff = () => {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setHours(CUTOFF_HOUR, 0, 0, 0);
  const daysUntil = (CUTOFF_DAY - now.getDay() + 7) % 7;
  cutoff.setDate(cutoff.getDate() + daysUntil);
  if (cutoff <= now) cutoff.setDate(cutoff.getDate() + 7);
  return cutoff;
};

const pad = (n: number) => n.toString().padStart(2, "0");

/**
 * Honest-urgency replacement for CountdownTimer: counts down to a real,
 * recurring dispatch cutoff instead of resetting to midnight every day,
 * and says exactly what the deadline means.
 */
const HonestCountdown = () => {
  const [cutoff] = useState(getNextCutoff);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = Math.max(0, cutoff.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return (
    <div className="w-full bg-foreground text-background rounded-lg px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium">
      <span>🖨️</span>
      <span>
        Order within{" "}
        <span className="font-bold tabular-nums">
          {days > 0 ? `${days}d ` : ""}
          {pad(hours)}:{pad(minutes)}:{pad(seconds)}
        </span>{" "}
        to make this week&apos;s print run
      </span>
    </div>
  );
};

export default HonestCountdown;
