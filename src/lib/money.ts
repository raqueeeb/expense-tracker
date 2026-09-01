/**
 * All money in this app is an integer number of minor units (paise / cents).
 * Nothing multiplies or divides money in floating point except at the
 * display/parse boundary, which is exactly what these helpers own.
 */
export type Currency = "INR" | "USD";

export const CURRENCY_META: Record<Currency, { symbol: string; locale: string; code: string }> = {
  INR: { symbol: "\u20b9", locale: "en-IN", code: "INR" },
  USD: { symbol: "$", locale: "en-US", code: "USD" },
};

/** "1,234.50" | "1234.5" -> 123450. Returns null when not a valid amount. */
export function parseAmountToMinor(input: string | number): number | null {
  const raw = typeof input === "number" ? String(input) : input.trim().replace(/,/g, "");
  if (raw === "" || !/^\d*\.?\d*$/.test(raw)) return null;
  const [whole, frac = ""] = raw.split(".");
  if (frac.length > 2) return null;
  const minor = Number(whole || "0") * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isFinite(minor) || !Number.isSafeInteger(minor)) return null;
  return minor;
}

export function minorToDecimalString(minor: number): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function formatMoney(minor: number, currency: Currency, opts?: { signed?: boolean }): string {
  const { locale, code } = CURRENCY_META[currency];
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(minor) / 100);
  if (!opts?.signed) return minor < 0 ? `-${formatted}` : formatted;
  return `${minor < 0 ? "-" : "+"}${formatted}`;
}

/**
 * Percentage guarded against the two ways this breaks in a budget app:
 * a zero budget (division by zero -> Infinity) and a negative input.
 */
export function safePercent(part: number, whole: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return 0;
  const pct = (part / whole) * 100;
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.round(pct * 10) / 10);
}
