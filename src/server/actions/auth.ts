"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/lib/auth";
import { registerSchema, loginSchema } from "@/lib/validation";
import { defaultCategoryRows } from "@/lib/default-categories";
import { type ActionState, fromZodError, fromUnknownError } from "../action-result";

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { name, email, password } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return { ok: false, fieldErrors: { email: ["An account with this email already exists"] } };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // The account and its starter categories are created together: a user
    // without categories could not record a transaction.
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name, email, passwordHash } });
      await tx.category.createMany({ data: defaultCategoryRows(user.id) });
    });
  } catch (e) {
    return fromUnknownError(e, "Could not create the account. Try again.");
  }

  // The account now exists. If signing in fails anyway, send the user to the
  // login page rather than an error boundary: reporting "could not create the
  // account" would be false, and re-submitting would hit the duplicate-email
  // branch. redirect() throws NEXT_REDIRECT, so it stays outside the try.
  let signedIn = true;
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (e) {
    console.error(e);
    signedIn = false;
  }

  redirect(signedIn ? "/dashboard" : "/login");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      // Deliberately identical for "no such user" and "wrong password".
      return { ok: false, error: "Email or password is incorrect." };
    }
    return fromUnknownError(e, "Could not sign in. Try again.");
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
