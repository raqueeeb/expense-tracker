"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveBudget, deleteBudget } from "@/server/actions/budget";
import { idleState } from "@/server/action-result";
import { Alert, Button, Field, Input } from "@/components/ui";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function BudgetForm({
  year,
  month,
  currentMinor,
  currencySymbol,
}: {
  year: number;
  month: number;
  currentMinor: number | null;
  currencySymbol: string;
}) {
  const [state, action] = useActionState(saveBudget, idleState);
  const [removeState, removeAction] = useActionState(deleteBudget, idleState);

  return (
    <div className="space-y-3">
      <form action={action} className="space-y-3" noValidate>
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="month" value={month} />
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
        <Field
          label={`Budget for this month (${currencySymbol})`}
          htmlFor="amount"
          error={state.fieldErrors?.amount}
          hint="Only expenses count against the budget."
        >
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            className="num"
            defaultValue={currentMinor === null ? "" : (currentMinor / 100).toFixed(2)}
            placeholder="0.00"
          />
        </Field>
        <Submit label={currentMinor === null ? "Set budget" : "Update budget"} />
      </form>

      {currentMinor !== null ? (
        <form action={removeAction}>
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          {removeState.error ? <Alert>{removeState.error}</Alert> : null}
          <Button type="submit" variant="ghost" size="sm">
            Remove budget for this month
          </Button>
        </form>
      ) : null}
    </div>
  );
}
