import { requireUser } from "@/lib/session";
import { CURRENCY_META, formatMoney, safePercent } from "@/lib/money";
import { getCategoryBreakdown, getMonthSummary, monthLabel, monthParam, parseMonthParam } from "@/lib/queries";
import { MonthPicker } from "@/components/month-picker";
import { BudgetForm } from "@/components/budget-form";
import { BudgetProgress } from "@/components/summary";
import { Card, CardHeader, EmptyState } from "@/components/ui";

export const metadata = { title: "Budget — Ledgerly" };

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const user = await requireUser();
  const { m } = await searchParams;
  const key = parseMonthParam(m);

  const [summary, breakdown] = await Promise.all([
    getMonthSummary(user.id, key),
    getCategoryBreakdown(user.id, key, "EXPENSE"),
  ]);

  const money = (v: number) => formatMoney(v, user.currency);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Budget</h1>
          <p className="mt-0.5 text-sm text-ink-soft dark:text-slate-400">{monthLabel(key)}</p>
        </div>
        <MonthPicker value={monthParam(key)} label={monthLabel(key)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Monthly limit" description="Set separately for each month" />
          <div className="p-4">
            <BudgetForm
              year={key.year}
              month={key.month}
              currentMinor={summary.budget}
              currencySymbol={CURRENCY_META[user.currency].symbol}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Where you stand" description={monthLabel(key)} />
          <div className="space-y-4 p-4">
            <BudgetProgress budget={summary.budget} spent={summary.expenses} currency={user.currency} />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-ink-soft dark:text-slate-400">Spent</dt>
                <dd className="num font-medium text-debit">{money(summary.expenses)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft dark:text-slate-400">Earned</dt>
                <dd className="num font-medium text-credit">{money(summary.income)}</dd>
              </div>
            </dl>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Spending by category" description={`Share of ${monthLabel(key)} expenses`} />
        {breakdown.length === 0 ? (
          <EmptyState title="No expenses this month" description="Once you record expenses, the split by category appears here." />
        ) : (
          <ul className="divide-y divide-surface-line dark:divide-night-line">
            {breakdown.map((c) => {
              const share = safePercent(c.total, summary.expenses);
              return (
                <li key={c.categoryId} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="num text-ink-soft dark:text-slate-400">
                      {money(c.total)} · {share}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunk dark:bg-night">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(share, 100)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
