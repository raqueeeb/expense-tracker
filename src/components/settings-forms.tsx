"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { updateProfile, changePassword } from "@/server/actions/settings";
import { createCategory, deleteCategory } from "@/server/actions/categories";
import { idleState } from "@/server/action-result";
import { Alert, Button, Field, Input, Select } from "@/components/ui";

function Submit({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? busy : label}
    </Button>
  );
}

export function ProfileForm({ name, email, currency }: { name: string; email: string; currency: "INR" | "USD" }) {
  const [state, action] = useActionState(updateProfile, idleState);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="Name" htmlFor="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" defaultValue={name} required />
      </Field>
      <Field label="Email" htmlFor="email" hint="Your sign-in address cannot be changed here.">
        <Input id="email" defaultValue={email} disabled />
      </Field>
      <Field label="Currency" htmlFor="currency" error={state.fieldErrors?.currency}>
        <Select id="currency" name="currency" defaultValue={currency}>
          <option value="INR">Indian rupee (₹)</option>
          <option value="USD">US dollar ($)</option>
        </Select>
      </Field>
      <Submit label="Save changes" busy="Saving…" />
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, idleState);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="Current password" htmlFor="currentPassword" error={state.fieldErrors?.currentPassword}>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="New password" htmlFor="newPassword" hint="At least 8 characters." error={state.fieldErrors?.newPassword}>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={state.fieldErrors?.confirmPassword}>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </Field>
      <Submit label="Change password" busy="Changing…" />
    </form>
  );
}

export function CategoryManager({
  categories,
}: {
  categories: { id: string; name: string; type: "INCOME" | "EXPENSE"; isSystem: boolean }[];
}) {
  const [addState, addAction] = useActionState(createCategory, idleState);
  const [removeState, removeAction] = useActionState(deleteCategory, idleState);

  return (
    <div className="space-y-4">
      <form action={addAction} className="flex flex-col gap-2 sm:flex-row sm:items-end" noValidate>
        <div className="flex-1">
          <Field label="New category" htmlFor="categoryName" error={addState.fieldErrors?.name}>
            <Input id="categoryName" name="name" placeholder="Gym membership" required />
          </Field>
        </div>
        <div className="sm:w-40">
          <Field label="Applies to" htmlFor="categoryType" error={addState.fieldErrors?.type}>
            <Select id="categoryType" name="type" defaultValue="EXPENSE">
              <option value="EXPENSE">Expenses</option>
              <option value="INCOME">Income</option>
            </Select>
          </Field>
        </div>
        <Submit label="Add" busy="Adding…" />
      </form>

      {addState.error ? <Alert>{addState.error}</Alert> : null}
      {removeState.error ? <Alert>{removeState.error}</Alert> : null}

      <ul className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <li
            key={c.id}
            className="inline-flex items-center gap-1.5 rounded-md border border-surface-line px-2 py-1 text-sm dark:border-night-line"
          >
            <span>{c.name}</span>
            <span className="text-xs text-ink-soft dark:text-slate-400">{c.type === "INCOME" ? "income" : "expense"}</span>
            {c.isSystem ? null : (
              <form action={removeAction}>
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  aria-label={`Delete category ${c.name}`}
                  className="rounded p-0.5 text-ink-soft hover:text-debit dark:text-slate-400"
                >
                  <Trash2 size={13} aria-hidden />
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
