"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { formatMoney, type Currency } from "@/lib/money";
import { idleState } from "@/server/action-result";
import { deleteTransaction } from "@/server/actions/transactions";
import { Modal } from "@/components/modal";
import { TransactionForm, type CategoryOption } from "@/components/transaction-form";
import { Alert, Badge, Button, Card } from "@/components/ui";

export type TransactionRow = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amountMinor: number;
  categoryId: string;
  categoryName: string;
  description: string;
  date: string; // yyyy-mm-dd
  paymentMethod: string;
  notes: string | null;
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  NETBANKING: "Net banking",
  WALLET: "Wallet",
  OTHER: "—",
};

function displayDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Amount({ row, currency }: { row: TransactionRow; currency: Currency }) {
  const signed = row.type === "INCOME" ? row.amountMinor : -row.amountMinor;
  return (
    <span className={`num font-medium ${row.type === "INCOME" ? "text-credit" : "text-debit"}`}>
      {formatMoney(signed, currency, { signed: true })}
    </span>
  );
}

export function TransactionList({
  rows,
  categories,
  currency,
}: {
  rows: TransactionRow[];
  categories: CategoryOption[];
  currency: Currency;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<TransactionRow | null>(null);
  const [deleting, setDeleting] = useState<TransactionRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirmDelete = () => {
    if (!deleting) return;
    setError(null);
    const fd = new FormData();
    fd.set("id", deleting.id);
    startTransition(async () => {
      const result = await deleteTransaction(idleState, fd);
      if (!result.ok) {
        setError(result.error ?? "Could not delete this transaction.");
        return;
      }
      setDeleting(null);
      router.refresh();
    });
  };

  return (
    <>
      {/* Desktop: a dense table, because scanning many rows is the job here. */}
      <table className="hidden w-full text-sm md:table">
        <caption className="sr-only">Your transactions</caption>
        <thead>
          <tr className="border-b border-surface-line text-left text-xs text-ink-soft dark:border-night-line dark:text-slate-400">
            <th scope="col" className="px-4 py-2 font-medium">Date</th>
            <th scope="col" className="px-4 py-2 font-medium">Description</th>
            <th scope="col" className="px-4 py-2 font-medium">Category</th>
            <th scope="col" className="px-4 py-2 font-medium">Paid with</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Amount</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-line dark:divide-night-line">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="num whitespace-nowrap px-4 py-2.5 text-ink-soft dark:text-slate-400">{displayDate(row.date)}</td>
              <td className="max-w-xs truncate px-4 py-2.5 font-medium">{row.description}</td>
              <td className="px-4 py-2.5">
                <Badge tone={row.type === "INCOME" ? "income" : "expense"}>{row.categoryName}</Badge>
              </td>
              <td className="px-4 py-2.5 text-ink-soft dark:text-slate-400">{PAYMENT_LABELS[row.paymentMethod] ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <Amount row={row} currency={currency} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <Button variant="ghost" size="sm" aria-label={`Edit ${row.description}`} onClick={() => setEditing(row)}>
                  <Pencil size={15} aria-hidden />
                </Button>
                <Button variant="ghost" size="sm" aria-label={`Delete ${row.description}`} onClick={() => setDeleting(row)}>
                  <Trash2 size={15} aria-hidden />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: one card per transaction, amount kept on the right edge. */}
      <ul className="space-y-2 md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <Card className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.description}</p>
                  <p className="num mt-0.5 text-xs text-ink-soft dark:text-slate-400">
                    {row.categoryName} · {displayDate(row.date)}
                  </p>
                </div>
                <Amount row={row} currency={currency} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-ink-soft dark:text-slate-400">
                  {PAYMENT_LABELS[row.paymentMethod] ?? "—"}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" aria-label={`Edit ${row.description}`} onClick={() => setEditing(row)}>
                    <Pencil size={15} aria-hidden />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label={`Delete ${row.description}`} onClick={() => setDeleting(row)}>
                    <Trash2 size={15} aria-hidden />
                  </Button>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {editing ? (
        <TransactionForm
          categories={categories}
          transaction={{
            id: editing.id,
            type: editing.type,
            amountMinor: editing.amountMinor,
            categoryId: editing.categoryId,
            description: editing.description,
            date: editing.date,
            paymentMethod: editing.paymentMethod,
            notes: editing.notes,
          }}
          open={Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}

      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete this transaction?">
        {error ? <Alert>{error}</Alert> : null}
        <p className="text-sm text-ink-soft dark:text-slate-400">
          {deleting ? `“${deleting.description}” will be removed from your ledger. This cannot be undone.` : ""}
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="danger" onClick={confirmDelete} disabled={pending}>
            {pending ? "Deleting…" : "Delete transaction"}
          </Button>
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Keep it
          </Button>
        </div>
      </Modal>
    </>
  );
}
