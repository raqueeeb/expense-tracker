import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";
import type { Currency } from "./money";

export type SessionUser = { id: string; name: string; email: string; currency: Currency };

/**
 * Single source of truth for "who is calling". Every server action and page
 * that touches financial data goes through this - the user id is read from the
 * signed session cookie, never from the request body.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, currency: true },
  });
  if (!user) redirect("/login");

  return { ...user, currency: user.currency as Currency };
}

export async function getOptionalUser() {
  const session = await auth();
  return session?.user?.id ? session.user : null;
}
