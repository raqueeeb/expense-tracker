"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { budgetSchema } from "@/lib/validation";
import { type ActionState, fromZodError, fromUnknownError } from "../action-result";

export async function saveBudget(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = budgetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { year, month, amount } = parsed.data;

  try {
    await prisma.budget.upsert({
      where: { userId_year_month: { userId: user.id, year, month } },
      create: { userId: user.id, year, month, amountMinor: amount },
      update: { amountMinor: amount },
    });
  } catch (e) {
    return fromUnknownError(e, "Could not save the budget.");
  }

  revalidatePath("/budget");
  revalidatePath("/dashboard");
  return { ok: true, message: "Budget saved" };
}

export async function deleteBudget(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  if (!Number.isInteger(year) || !Number.isInteger(month)) return { ok: false, error: "Invalid month." };

  try {
    await prisma.budget.deleteMany({ where: { userId: user.id, year, month } });
  } catch (e) {
    return fromUnknownError(e, "Could not remove the budget.");
  }

  revalidatePath("/budget");
  revalidatePath("/dashboard");
  return { ok: true, message: "Budget removed" };
}
