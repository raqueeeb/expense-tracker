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

/**
 * Truthy only when the session cookie names an account that still exists.
 *
 * The existence check is not redundant with the cookie being valid. A JWT
 * outlives the row it points at, and the callers of this function redirect
 * signed-in visitors away from /login and /register. Trusting the cookie alone
 * meant a user whose account had been deleted was sent from /login to
 * /dashboard, where requireUser() found no row and sent them back to /login -
 * an unbreakable redirect loop. Checking the same thing requireUser() checks
 * keeps the two in agreement.
 *
 * The extra query only runs on the entry and auth routes, which are not hot.
 */
export async function getOptionalUser(): Promise<SessionUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, currency: true },
  });
  if (!user) return null;

  return { ...user, currency: user.currency as Currency };
}
