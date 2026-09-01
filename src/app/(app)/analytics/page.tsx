import { requireUser } from "@/lib/session";
import { formatMoney, safePercent } from "@/lib/money";
import {
  getCategoryBreakdown,
  getMonthSummary,
  getMonthlyTrend,
  monthLabel,
  monthParam,
  parseMonthParam,
} from "@/lib/queries";
import { MonthPicker } from "@/components/month-picker";
import { CategoryDonut } from "@/components/charts/category-donut";
import { TrendChart } from "@/components/charts/trend-chart";
import { colorFor } from "@/components/charts/palette";
import { Card, CardHeader, EmptyState } from "@/components/ui";

export const metadata = { title: "Analytics — Ledgerly" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const user = await requireUser();
  const { m } = await searchParams;
  const key = parseMonthParam(m);

  const [summary, breakdown, trend] = await Promise.all([
    getMonthSummary(user.id, key),
    getCategoryBreakdown(user.id, key, "EXPENSE"),
    getMonthlyTrend(user.id, key, 6),
  ]);

  const money = (v: number) => formatMoney(v, user.currency);

  // Compare this month with the previous one; both may legitimately be zero.
  const thisMonth = trend[trend.length - 1]?.expenses ?? 0;
  const prevMonth = trend[trend.length - 2]?.expenses ?? 0;
  const delta = thisMonth - prevMonth;
  const deltaPct = prevMonth > 0 ? safePercent(Math.abs(delta), prevMonth) : null;

  const monthsWithSpend = trend.filter((t) => t.expenses > 0);
  const average =
    monthsWithSpend.length > 0
      ? Math.round(monthsWithSpend.reduce((s, t) => s + t.expenses, 0) / monthsWithSpend.length)
      : 0;

  const trendSentence =
    prevMonth === 0 && thisMonth === 0
      ? "No expenses recorded in either month."
      : prevMonth === 0
        ? `First month with recorded expenses: ${money(thisMonth)}.`
        : delta === 0
          ? "Spending is exactly level with last month."
          : `Spending is ${delta > 0 ? "up" : "down"} ${money(Math.abs(delta))}${deltaPct !== null ? ` (${deltaPct}%)` : ""} against last month.`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-0.5 text-sm text-ink-soft dark:text-slate-400">{monthLabel(key)}</p>
        </div>
        <MonthPicker value={monthParam(key)} label={monthLabel(key)} />
      </div>

      <Card className="p-4">
        <p className="text-sm font-medium">{trendSentence}</p>
        <p className="num mt-1 text-xs text-ink-soft dark:text-slate-400">
          Average monthly spend over the last six months: {money(average)}
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Expenses by category" description={monthLabel(key)} />
          {breakdown.length === 0 ? (
            <EmptyState title="Nothing to chart yet" description="Record expenses this month and the split appears here." />
          ) : (
            <div className="p-2">
              <CategoryDonut data={breakdown.map((b) => ({ name: b.name, total: b.total }))} currency={user.currency} />
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Income vs expenses" description="Last six months" />
          <div className="p-2">
            <TrendChart data={trend} currency={user.currency} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Biggest categories" description={`Ranked by spend in ${monthLabel(key)}`} />
        {breakdown.length === 0 ? (
          <EmptyState title="No expenses this month" description="Your top spending categories will be listed here." />
        ) : (
          <ol className="divide-y divide-surface-line dark:divide-night-line">
            {breakdown.slice(0, 8).map((c, i) => (
              <li key={c.categoryId} className="flex items-center gap-3 px-4 py-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorFor(i) }} aria-hidden />
                <span className="flex-1 text-sm font-medium">{c.name}</span>
                <span className="num text-sm text-ink-soft dark:text-slate-400">
                  {money(c.total)} · {safePercent(c.total, summary.expenses)}%
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
