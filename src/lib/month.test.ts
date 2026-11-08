/**
 * Calendar-month helpers.
 *
 * Every figure on the dashboard is filtered by one of these ranges, so the
 * December boundary and the half-open end are the parts that matter: an
 * inclusive end would count the first transaction of the next month twice,
 * and a December range that forgets to roll the year lands in the past.
 */

import { describe, expect, it, vi } from "vitest";

import { currentMonth, monthLabel, monthParam, monthRange, parseMonthParam } from "@/lib/month";

describe("monthRange", () => {
  it("spans the first of the month to the first of the next", () => {
    const { start, end } = monthRange({ year: 2026, month: 3 });
    expect(start.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });

  it("rolls the year over in December", () => {
    const { start, end } = monthRange({ year: 2026, month: 12 });
    expect(start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("covers the leap day in February", () => {
    const { start, end } = monthRange({ year: 2028, month: 2 });
    expect(start.toISOString()).toBe("2028-02-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2028-03-01T00:00:00.000Z");
    const days = (end.getTime() - start.getTime()) / 86_400_000;
    expect(days).toBe(29);
  });

  it("is half-open, so the next month's first instant is excluded", () => {
    const { end } = monthRange({ year: 2026, month: 1 });
    const firstOfFebruary = new Date(Date.UTC(2026, 1, 1));
    expect(end.getTime()).toBe(firstOfFebruary.getTime());
    // A transaction stamped exactly at `end` belongs to February.
    expect(firstOfFebruary < end).toBe(false);
  });

  it("builds every month of a year without a gap or an overlap", () => {
    for (let month = 1; month <= 12; month += 1) {
      const current = monthRange({ year: 2026, month });
      const next = monthRange(month === 12 ? { year: 2027, month: 1 } : { year: 2026, month: month + 1 });
      expect(current.end.getTime()).toBe(next.start.getTime());
    }
  });
});

describe("parseMonthParam", () => {
  it("accepts a well-formed value", () => {
    expect(parseMonthParam("2026-07")).toEqual({ year: 2026, month: 7 });
  });

  it("accepts the boundary months", () => {
    expect(parseMonthParam("2026-01")).toEqual({ year: 2026, month: 1 });
    expect(parseMonthParam("2026-12")).toEqual({ year: 2026, month: 12 });
  });

  it("falls back to the current month for anything malformed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00Z"));
    const now = { year: 2026, month: 5 };

    for (const bad of [undefined, "", "2026", "2026-1", "26-01", "2026-13", "2026-00", "not-a-month", "2026-07-01"]) {
      expect(parseMonthParam(bad)).toEqual(now);
    }

    vi.useRealTimers();
  });

  it("rejects years outside the supported range", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00Z"));
    expect(parseMonthParam("1999-06")).toEqual({ year: 2026, month: 5 });
    expect(parseMonthParam("2101-06")).toEqual({ year: 2026, month: 5 });
    // The ends of the range are allowed.
    expect(parseMonthParam("2000-06")).toEqual({ year: 2000, month: 6 });
    expect(parseMonthParam("2100-06")).toEqual({ year: 2100, month: 6 });
    vi.useRealTimers();
  });
});

describe("monthParam", () => {
  it("zero-pads single-digit months", () => {
    expect(monthParam({ year: 2026, month: 1 })).toBe("2026-01");
    expect(monthParam({ year: 2026, month: 9 })).toBe("2026-09");
  });

  it("leaves two-digit months alone", () => {
    expect(monthParam({ year: 2026, month: 12 })).toBe("2026-12");
  });

  it("round-trips through parseMonthParam", () => {
    for (let month = 1; month <= 12; month += 1) {
      const key = { year: 2026, month };
      expect(parseMonthParam(monthParam(key))).toEqual(key);
    }
  });
});

describe("currentMonth", () => {
  it("reads the month in UTC, not the local zone", () => {
    vi.useFakeTimers();
    // 20:30 in New York on the 31st is already the 1st in UTC, so a local
    // reading would report the wrong month.
    vi.setSystemTime(new Date("2026-01-01T01:30:00Z"));
    expect(currentMonth()).toEqual({ year: 2026, month: 1 });
    vi.useRealTimers();
  });
});

describe("monthLabel", () => {
  it("names the month and year", () => {
    expect(monthLabel({ year: 2026, month: 3 })).toBe("March 2026");
    expect(monthLabel({ year: 2026, month: 12 })).toBe("December 2026");
  });

  it("labels January without slipping into the previous year", () => {
    // Formatting the first instant of a month in a zone behind UTC would
    // print December of the year before; the formatter is pinned to UTC.
    expect(monthLabel({ year: 2026, month: 1 })).toBe("January 2026");
  });
});
