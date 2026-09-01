import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getCategories, listTransactions } from "@/lib/queries";
import { TransactionFilters } from "@/components/transaction-filters";
import { TransactionList, type TransactionRow } from "@/components/transaction-list";
import { AddTransactionButton } from "@/components/transaction-form";
import { Button, Card, EmptyState } from "@/components/ui";

export const metadata = { title: "Transactions — Ledgerly" };

type SearchParams = {
  q?: string; type?: string; categoryId?: string; from?: string; to?: string;
  sort?: string; dir?: string; page?: string;
};

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;

  const filters = {
    q: sp.q?.trim() || undefined,
    type: sp.type === "INCOME" || sp.type === "EXPENSE" ? sp.type : ("ALL" as const),
    categoryId: sp.categoryId || undefined,
    from: sp.from || undefined,
    to: sp.to || undefined,
    sort: sp.sort === "amount" ? ("amount" as const) : ("date" as const),
    dir: sp.dir === "asc" ? ("asc" as const) : ("desc" as const),
    page: Number(sp.page) > 0 ? Number(sp.page) : 1,
  };

  const [{ rows, total, page, pageCount }, categories] = await Promise.all([
    listTransactions(user.id, filters),
    getCategories(user.id),
  ]);

  const listRows: TransactionRow[] = rows.map((t) => ({
    id: t.id,
    type: t.type,
    amountMinor: t.amountMinor,
    categoryId: t.categoryId,
    categoryName: t.category.name,
    description: t.description,
    date: t.date.toISOString().slice(0, 10),
    paymentMethod: t.paymentMethod,
    notes: t.notes,
  }));

  const pageLink = (n: number) => {
    const q = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    q.set("page", String(n));
    return `/transactions?${q.toString()}`;
  };

  const exportHref = (() => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page") q.set(k, v);
    return `/api/transactions/export${q.toString() ? `?${q}` : ""}`;
  })();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Transactions</h1>
          <p className="num mt-0.5 text-sm text-ink-soft dark:text-slate-400">
            {total} {total === 1 ? "entry" : "entries"} match your filters
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={exportHref}
            download
            className="inline-flex h-8 items-center rounded-md border border-surface-line bg-surface px-3 text-sm font-medium hover:bg-surface-sunk dark:border-night-line dark:bg-night-sunk dark:hover:bg-night"
          >
            Export CSV
          </a>
          <AddTransactionButton categories={categories} label="Add" />
        </div>
      </div>

      <TransactionFilters categories={categories} />

      <Card className="overflow-hidden border-0 bg-transparent md:border md:bg-surface md:dark:bg-night-sunk">
        {listRows.length === 0 ? (
          <EmptyState
            title="No transactions here"
            description="Nothing matches these filters yet. Clear them, or add a transaction to get started."
            action={<AddTransactionButton categories={categories} label="Add transaction" />}
          />
        ) : (
          <TransactionList rows={listRows} categories={categories} currency={user.currency} />
        )}
      </Card>

      {pageCount > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between">
          <p className="num text-sm text-ink-soft dark:text-slate-400">
            Page {page} of {pageCount}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={pageLink(page - 1)} className="rounded-md border border-surface-line px-3 py-1.5 text-sm dark:border-night-line">
                Previous
              </Link>
            ) : null}
            {page < pageCount ? (
              <Link href={pageLink(page + 1)} className="rounded-md border border-surface-line px-3 py-1.5 text-sm dark:border-night-line">
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
