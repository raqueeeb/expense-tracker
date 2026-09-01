import { describe, expect, it } from "vitest";
import { parseAmountToMinor, minorToDecimalString, formatMoney, safePercent } from "./money";
import { csvCell, toCsv } from "./csv";
import { monthRange, parseMonthParam } from "./month";

describe("parseAmountToMinor", () => {
  it("parses whole and decimal amounts", () => {
    expect(parseAmountToMinor("1000")).toBe(100000);
    expect(parseAmountToMinor("1,234.50")).toBe(123450);
    expect(parseAmountToMinor("0.05")).toBe(5);
    expect(parseAmountToMinor(".5")).toBe(50);
  });

  it("does not lose a paisa to floating point", () => {
    // 0.1 + 0.2 in floats is 0.30000000000000004; in minor units it is 30.
    expect(parseAmountToMinor("0.1")! + parseAmountToMinor("0.2")!).toBe(30);
    expect(parseAmountToMinor("19.99")).toBe(1999);
    expect(parseAmountToMinor("8.29")).toBe(829);
  });

  it("rejects junk, negatives and over-precise input", () => {
    expect(parseAmountToMinor("abc")).toBeNull();
    expect(parseAmountToMinor("-50")).toBeNull();
    expect(parseAmountToMinor("10.005")).toBeNull();
    expect(parseAmountToMinor("")).toBeNull();
  });
});

describe("minorToDecimalString", () => {
  it("always keeps two decimals", () => {
    expect(minorToDecimalString(123450)).toBe("1234.50");
    expect(minorToDecimalString(5)).toBe("0.05");
    expect(minorToDecimalString(-2500)).toBe("-25.00");
  });
});

describe("formatMoney", () => {
  it("formats both supported currencies", () => {
    expect(formatMoney(10000000, "INR")).toContain("1,00,000.00"); // Indian lakh grouping
    expect(formatMoney(150000, "USD")).toContain("1,500.00");
  });

  it("marks direction when asked", () => {
    expect(formatMoney(45000, "INR", { signed: true }).startsWith("+")).toBe(true);
    expect(formatMoney(-45000, "INR", { signed: true }).startsWith("-")).toBe(true);
  });
});

describe("safePercent", () => {
  it("computes a normal percentage", () => {
    expect(safePercent(3500000, 5000000)).toBe(70);
  });

  it("never returns NaN, Infinity or a negative", () => {
    expect(safePercent(100, 0)).toBe(0);
    expect(safePercent(0, 0)).toBe(0);
    expect(safePercent(-100, 500)).toBe(0);
    expect(Number.isFinite(safePercent(1, 0))).toBe(true);
  });

  it("reports over-spend above 100", () => {
    expect(safePercent(5200000, 5000000)).toBe(104);
  });
});

describe("monthRange", () => {
  it("is a half-open UTC range", () => {
    const { start, end } = monthRange({ year: 2026, month: 1 });
    expect(start.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });

  it("rolls over December correctly", () => {
    const { end } = monthRange({ year: 2026, month: 12 });
    expect(end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("parseMonthParam", () => {
  it("accepts a valid month and rejects nonsense", () => {
    expect(parseMonthParam("2026-03")).toEqual({ year: 2026, month: 3 });
    const fallback = parseMonthParam("2026-13");
    expect(fallback.month).toBeGreaterThanOrEqual(1);
    expect(fallback.month).toBeLessThanOrEqual(12);
  });
});

describe("csv", () => {
  it("quotes separators and escapes quotes", () => {
    expect(csvCell('Lunch, "with" team')).toBe('"Lunch, ""with"" team"');
  });

  it("neutralises formula injection", () => {
    expect(csvCell("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
  });

  it("writes CRLF rows", () => {
    expect(toCsv(["A"], [["1"]])).toBe("A\r\n1\r\n");
  });
});
