import { useState, useEffect } from "react";

const getTimeToMidnight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds };
};

const pad = (n: number) => n.toString().padStart(2, "0");

const CountdownTimer = () => {
  const [time, setTime] = useState(getTimeToMidnight);

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeToMidnight()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-foreground text-background rounded-lg px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium">
      <span>⏰</span>
      <span>
        Hurry! Offer expires in{" "}
        <span className="font-bold tabular-nums">
          {pad(time.hours)}:{pad(time.minutes)}:{pad(time.seconds)}
        </span>
      </span>
    </div>
  );
};

export default CountdownTimer;
