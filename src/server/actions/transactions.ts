"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { transactionSchema, transactionUpdateSchema } from "@/lib/validation";
import { type ActionState, fromZodError, fromUnknownError } from "../action-result";

function revalidateAll() {
  for (const p of ["/dashboard", "/transactions", "/expenses", "/income", "/budget", "/analytics"]) {
    revalidatePath(p);
  }
}

/**
 * Category ids arrive from a <select> the client controls, so they are verified
 * against the signed-in user before any write. Same reason transaction ids are
 * matched with `userId` in the WHERE clause rather than fetched by id alone.
 */
async function assertOwnedCategory(userId: string, categoryId: string, type: "INCOME" | "EXPENSE") {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId, type },
    select: { id: true },
  });
  return category !== null;
}

export async function createTransaction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = transactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;

  if (!(await assertOwnedCategory(user.id, d.categoryId, d.type))) {
    return { ok: false, fieldErrors: { categoryId: ["Choose a category from your list"] } };
  }

  try {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: d.type,
        amountMinor: d.amount,
        categoryId: d.categoryId,
        description: d.description,
        date: new Date(`${d.date}T00:00:00Z`),
        paymentMethod: d.type === "INCOME" ? "OTHER" : d.paymentMethod,
        notes: d.notes ? d.notes : null,
      },
    });
  } catch (e) {
    return fromUnknownError(e, "Could not save this transaction.");
  }

  revalidateAll();
  return { ok: true, message: d.type === "INCOME" ? "Income added" : "Expense added" };
}

export async function updateTransaction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = transactionUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;

  if (!(await assertOwnedCategory(user.id, d.categoryId, d.type))) {
    return { ok: false, fieldErrors: { categoryId: ["Choose a category from your list"] } };
  }

  try {
    const result = await prisma.transaction.updateMany({
      where: { id: d.id, userId: user.id },
      data: {
        type: d.type,
        amountMinor: d.amount,
        categoryId: d.categoryId,
        description: d.description,
        date: new Date(`${d.date}T00:00:00Z`),
        paymentMethod: d.type === "INCOME" ? "OTHER" : d.paymentMethod,
        notes: d.notes ? d.notes : null,
      },
    });
    if (result.count === 0) return { ok: false, error: "That transaction no longer exists." };
  } catch (e) {
    return fromUnknownError(e, "Could not update this transaction.");
  }

  revalidateAll();
  return { ok: true, message: "Changes saved" };
}

export async function deleteTransaction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing transaction." };

  try {
    const result = await prisma.transaction.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return { ok: false, error: "That transaction no longer exists." };
  } catch (e) {
    return fromUnknownError(e, "Could not delete this transaction.");
  }

  revalidateAll();
  return { ok: true, message: "Transaction deleted" };
}
