/** Calendar-month helpers. Kept free of database imports so they can be unit tested. */

export type MonthKey = { year: number; month: number }; // month is 1-12

/** UTC half-open range [start, end) for a calendar month. */
export function monthRange({ year, month }: MonthKey) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1));
  return { start, end };
}

export function currentMonth(): MonthKey {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export function parseMonthParam(value: string | undefined): MonthKey {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-").map(Number);
    if (m >= 1 && m <= 12 && y >= 2000 && y <= 2100) return { year: y, month: m };
  }
  return currentMonth();
}

export function monthParam({ year, month }: MonthKey) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthLabel({ year, month }: MonthKey) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
