import Link from "next/link";
import { requireUser } from "@/lib/session";
import { formatMoney } from "@/lib/money";
import {
  getCategories,
  getMonthSummary,
  getRecentTransactions,
  monthLabel,
  monthParam,
  parseMonthParam,
} from "@/lib/queries";
import { MonthPicker } from "@/components/month-picker";
import { AddTransactionButton } from "@/components/transaction-form";
import { StatCard, BudgetProgress } from "@/components/summary";
import { AmountCell, formatDate } from "@/components/transaction-row";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardHeader, EmptyState } from "@/components/ui";

export const metadata = { title: "Dashboard — Ledgerly" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const user = await requireUser();
  const { m } = await searchParams;
  const key = parseMonthParam(m);

  const [summary, recent, categories] = await Promise.all([
    getMonthSummary(user.id, key),
    getRecentTransactions(user.id, 6),
    getCategories(user.id),
  ]);

  const money = (v: number) => formatMoney(v, user.currency);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Hello, {user.name.split(" ")[0]}</h1>
          <p className="mt-0.5 text-sm text-ink-soft dark:text-slate-400">{monthLabel(key)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <MonthPicker value={monthParam(key)} label={monthLabel(key)} />
          <AddTransactionButton categories={categories} label="Add" />
        </div>
      </div>

      <section aria-label="Monthly summary" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Income this month" value={money(summary.income)} tone="income" />
        <StatCard label="Expenses this month" value={money(summary.expenses)} tone="expense" />
        <StatCard
          label="Balance this month"
          value={money(summary.balance)}
          hint={`All time: ${money(summary.lifetimeBalance)}`}
        />
        <StatCard label="Monthly budget" value={summary.budget === null ? "Not set" : money(summary.budget)} />
        <StatCard
          label={summary.budgetRemaining !== null && summary.budgetRemaining < 0 ? "Over budget by" : "Budget remaining"}
          value={
            summary.budgetRemaining === null
              ? "—"
              : money(Math.abs(summary.budgetRemaining))
          }
          tone={summary.budgetRemaining !== null && summary.budgetRemaining < 0 ? "expense" : "neutral"}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader
            title="Budget"
            description={monthLabel(key)}
            action={
              <Link href={`/budget?m=${monthParam(key)}`} className="text-xs font-medium text-brand underline underline-offset-4">
                Manage
              </Link>
            }
          />
          <div className="p-4">
            <BudgetProgress budget={summary.budget} spent={summary.expenses} currency={user.currency} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent transactions"
            description="Your six most recent entries"
            action={
              <Link href="/transactions" className="text-xs font-medium text-brand underline underline-offset-4">
                See all
              </Link>
            }
          />
          {recent.length === 0 ? (
            <EmptyState
              title="Nothing recorded yet"
              description="Add your first income or expense and it will show up here."
              action={<AddTransactionButton categories={categories} label="Add transaction" />}
            />
          ) : (
            <ul className="divide-y divide-surface-line dark:divide-night-line">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.description}</p>
                    <p className="num mt-0.5 text-xs text-ink-soft dark:text-slate-400">
                      {t.category.name} · {formatDate(t.date)}
                    </p>
                  </div>
                  <AmountCell type={t.type} amountMinor={t.amountMinor} currency={user.currency} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
