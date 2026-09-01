"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import type { z } from "zod";
import { transactionSchema } from "@/lib/validation";
import { minorToDecimalString } from "@/lib/money";
import { idleState } from "@/server/action-result";
import { createTransaction, updateTransaction } from "@/server/actions/transactions";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";

export type CategoryOption = { id: string; name: string; type: "INCOME" | "EXPENSE" };

export type EditableTransaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amountMinor: number;
  categoryId: string;
  description: string;
  date: string; // yyyy-mm-dd
  paymentMethod: string;
  notes: string | null;
};

type FormValues = z.input<typeof transactionSchema>;
type ParsedValues = z.output<typeof transactionSchema>;

const PAYMENT_METHODS = [
  ["CASH", "Cash"],
  ["CARD", "Card"],
  ["UPI", "UPI"],
  ["NETBANKING", "Net banking"],
  ["WALLET", "Wallet"],
  ["OTHER", "Other"],
] as const;

const today = () => new Date().toISOString().slice(0, 10);

export function TransactionForm({
  categories,
  defaultType = "EXPENSE",
  transaction,
  open,
  onOpenChange,
}: {
  categories: CategoryOption[];
  defaultType?: "INCOME" | "EXPENSE";
  transaction?: EditableTransaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues, unknown, ParsedValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: transaction
      ? {
          type: transaction.type,
          amount: minorToDecimalString(transaction.amountMinor),
          categoryId: transaction.categoryId,
          description: transaction.description,
          date: transaction.date,
          paymentMethod: transaction.paymentMethod as FormValues["paymentMethod"],
          notes: transaction.notes ?? "",
        }
      : { type: defaultType, amount: "", categoryId: "", description: "", date: today(), paymentMethod: "CASH", notes: "" },
  });

  const type = watch("type");
  const visibleCategories = categories.filter((c) => c.type === type);

  const onSubmit = handleSubmit((values: ParsedValues) => {
    setServerError(null);
    const fd = new FormData();
    for (const [k, v] of Object.entries(values)) fd.set(k, String(v ?? ""));
    if (transaction) fd.set("id", transaction.id);

    startTransition(async () => {
      const result = transaction
        ? await updateTransaction(idleState, fd)
        : await createTransaction(idleState, fd);

      if (!result.ok) {
        // The server re-validates independently; surface whatever it rejected.
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            setError(field as keyof FormValues, { message: messages[0] });
          }
        }
        setServerError(result.error ?? null);
        return;
      }

      onOpenChange(false);
      if (!transaction) reset({ ...values, amount: "", description: "", notes: "" });
      router.refresh();
    });
  });

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={transaction ? "Edit transaction" : type === "INCOME" ? "Add income" : "Add expense"}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {serverError ? <Alert>{serverError}</Alert> : null}

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Type</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["EXPENSE", "INCOME"] as const).map((value) => (
              <label
                key={value}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-surface-line px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/5 dark:border-night-line"
              >
                <input type="radio" value={value} {...register("type")} className="accent-brand" />
                {value === "EXPENSE" ? "Expense" : "Income"}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Amount" htmlFor="amount" error={errors.amount?.message ? [errors.amount.message] : undefined}>
          <Input
            id="amount"
            inputMode="decimal"
            placeholder="0.00"
            className="num"
            {...register("amount")}
          />
        </Field>

        <Field
          label={type === "INCOME" ? "Source" : "Category"}
          htmlFor="categoryId"
          error={errors.categoryId?.message ? [errors.categoryId.message] : undefined}
        >
          <Select id="categoryId" {...register("categoryId")}>
            <option value="">Choose one</option>
            {visibleCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Description"
          htmlFor="description"
          error={errors.description?.message ? [errors.description.message] : undefined}
        >
          <Input id="description" placeholder="Groceries at the corner store" {...register("description")} />
        </Field>

        <Field label="Date" htmlFor="date" error={errors.date?.message ? [errors.date.message] : undefined}>
          <Input id="date" type="date" className="num" {...register("date")} />
        </Field>

        {type === "EXPENSE" ? (
          <Field label="Paid with" htmlFor="paymentMethod" error={errors.paymentMethod?.message ? [errors.paymentMethod.message] : undefined}>
            <Select id="paymentMethod" {...register("paymentMethod")}>
              {PAYMENT_METHODS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <input type="hidden" value="OTHER" {...register("paymentMethod")} />
        )}

        <Field label="Notes (optional)" htmlFor="notes" error={errors.notes?.message ? [errors.notes.message] : undefined}>
          <Textarea id="notes" {...register("notes")} />
        </Field>

        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={pending} className="flex-1">
            {pending ? "Saving…" : transaction ? "Save changes" : "Add transaction"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Convenience trigger used on the dashboard and transactions pages. */
export function AddTransactionButton({
  categories,
  defaultType = "EXPENSE",
  label = "Add transaction",
}: {
  categories: CategoryOption[];
  defaultType?: "INCOME" | "EXPENSE";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={15} aria-hidden />
        {label}
      </Button>
      {open ? (
        <TransactionForm categories={categories} defaultType={defaultType} open={open} onOpenChange={setOpen} />
      ) : null}
    </>
  );
}
