"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { categorySchema } from "@/lib/validation";
import { type ActionState, fromZodError, fromUnknownError } from "../action-result";

export async function createCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { name, type } = parsed.data;

  try {
    await prisma.category.create({ data: { userId: user.id, name, type, isSystem: false } });
  } catch (e) {
    // Unique constraint is (userId, type, name): duplicates are per-user only.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, fieldErrors: { name: ["You already have a category with this name"] } };
    }
    return fromUnknownError(e, "Could not add the category.");
  }

  revalidatePath("/settings");
  revalidatePath("/transactions");
  return { ok: true, message: "Category added" };
}

export async function deleteCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing category." };

  const category = await prisma.category.findFirst({ where: { id, userId: user.id } });
  if (!category) return { ok: false, error: "That category no longer exists." };
  if (category.isSystem) return { ok: false, error: "Built-in categories cannot be deleted." };

  const inUse = await prisma.transaction.count({ where: { userId: user.id, categoryId: id } });
  if (inUse > 0) {
    return { ok: false, error: `This category is used by ${inUse} transaction(s). Move them first.` };
  }

  try {
    await prisma.category.deleteMany({ where: { id, userId: user.id, isSystem: false } });
  } catch (e) {
    return fromUnknownError(e, "Could not delete the category.");
  }

  revalidatePath("/settings");
  return { ok: true, message: "Category deleted" };
}
