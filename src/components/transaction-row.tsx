import { formatMoney, type Currency } from "@/lib/money";
import { Badge } from "@/components/ui";

export function AmountCell({ type, amountMinor, currency }: { type: "INCOME" | "EXPENSE"; amountMinor: number; currency: Currency }) {
  const signed = type === "INCOME" ? amountMinor : -amountMinor;
  return (
    <span className={`num font-medium ${type === "INCOME" ? "text-credit" : "text-debit"}`}>
      {formatMoney(signed, currency, { signed: true })}
    </span>
  );
}

export function TypeBadge({ type }: { type: "INCOME" | "EXPENSE" }) {
  return <Badge tone={type === "INCOME" ? "income" : "expense"}>{type === "INCOME" ? "Income" : "Expense"}</Badge>;
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}
