import { formatMoney, safePercent, type Currency } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui";

export function StatCard({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "income" | "expense" | "warn";
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-ink-soft dark:text-slate-400">{label}</p>
      <p
        className={cn(
          "num mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl",
          tone === "income" && "text-credit",
          tone === "expense" && "text-debit",
          tone === "warn" && "text-flag",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-soft dark:text-slate-400">{hint}</p> : null}
    </Card>
  );
}

export function BudgetProgress({
  budget,
  spent,
  currency,
}: {
  budget: number | null;
  spent: number;
  currency: Currency;
}) {
  if (budget === null || budget <= 0) {
    return (
      <p className="text-sm text-ink-soft dark:text-slate-400">
        No budget set for this month. Set one to track how much is left.
      </p>
    );
  }

  const used = safePercent(spent, budget);
  const over = spent > budget;
  const remaining = budget - spent;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="num text-sm font-medium">
          {formatMoney(spent, currency)} <span className="text-ink-soft dark:text-slate-400">of {formatMoney(budget, currency)}</span>
        </p>
        <p className={cn("num text-sm font-semibold", over ? "text-debit" : "text-credit")}>
          {over ? `Over by ${formatMoney(-remaining, currency)}` : `${formatMoney(remaining, currency)} left`}
        </p>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-sunk dark:bg-night"
        role="progressbar"
        aria-valuenow={Math.min(used, 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Budget used"
      >
        <div
          className={cn("h-full rounded-full", over ? "bg-debit" : used > 80 ? "bg-flag" : "bg-credit")}
          style={{ width: `${Math.min(used, 100)}%` }}
        />
      </div>
      <p className="num mt-1.5 text-xs text-ink-soft dark:text-slate-400">{used}% of budget used</p>
    </div>
  );
}
