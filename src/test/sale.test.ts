import { describe, it, expect } from "vitest";
import { getSaleName } from "@/lib/sale";

describe("getSaleName", () => {
  it("names the sale after the month of the given date", () => {
    expect(getSaleName(new Date(2026, 6, 29))).toBe("July Sale");
    expect(getSaleName(new Date(2026, 1, 3))).toBe("February Sale");
    expect(getSaleName(new Date(2026, 11, 25))).toBe("December Sale");
  });

  it("rolls over on the first of the month", () => {
    expect(getSaleName(new Date(2026, 6, 31, 23, 59, 59))).toBe("July Sale");
    expect(getSaleName(new Date(2026, 7, 1, 0, 0, 0))).toBe("August Sale");
  });

  it("covers every month", () => {
    const names = Array.from({ length: 12 }, (_, m) => getSaleName(new Date(2026, m, 15)));
    expect(new Set(names).size).toBe(12);
    expect(names.every((n) => n.endsWith(" Sale"))).toBe(true);
  });

  it("does not depend on the visitor's locale", () => {
    // toLocaleString("default") would return "juillet" here; the explicit
    // month table must not.
    const original = Intl.DateTimeFormat;
    try {
      // @ts-expect-error - deliberately forcing a non-English default locale
      Intl.DateTimeFormat = (...args: unknown[]) =>
        new original(args[0] ?? "fr-FR", args[1] as Intl.DateTimeFormatOptions);
      expect(getSaleName(new Date(2026, 6, 29))).toBe("July Sale");
    } finally {
      Intl.DateTimeFormat = original;
    }
  });

  it("defaults to the current month", () => {
    const now = new Date();
    expect(getSaleName()).toBe(getSaleName(now));
  });
});
