"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { settingsSchema, passwordChangeSchema } from "@/lib/validation";
import { type ActionState, fromZodError, fromUnknownError } from "../action-result";

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name, currency: parsed.data.currency },
    });
  } catch (e) {
    return fromUnknownError(e, "Could not save your settings.");
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true, message: "Settings saved" };
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = passwordChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!record) return { ok: false, error: "Account not found." };

  const ok = await bcrypt.compare(parsed.data.currentPassword, record.passwordHash);
  if (!ok) return { ok: false, fieldErrors: { currentPassword: ["That password is not correct"] } };

  try {
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  } catch (e) {
    return fromUnknownError(e, "Could not change your password.");
  }

  return { ok: true, message: "Password changed" };
}
