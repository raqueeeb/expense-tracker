import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildTransactionWhere, type TransactionFilters } from "@/lib/queries";
import { minorToDecimalString } from "@/lib/money";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to export your transactions." }, { status: 401 });
  }

  const sp = new URL(request.url).searchParams;
  const filters: TransactionFilters = {
    q: sp.get("q") ?? undefined,
    type: sp.get("type") === "INCOME" || sp.get("type") === "EXPENSE" ? (sp.get("type") as "INCOME" | "EXPENSE") : "ALL",
    categoryId: sp.get("categoryId") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  };

  // Scoped to the session user id - a userId in the query string is ignored.
  const rows = await prisma.transaction.findMany({
    where: buildTransactionWhere(session.user.id, filters),
    orderBy: { date: "desc" },
    take: 10_000,
    include: { category: { select: { name: true } } },
  });

  const csv = toCsv(
    ["Date", "Type", "Amount", "Category", "Description", "Payment method", "Notes"],
    rows.map((t) => [
      t.date.toISOString().slice(0, 10),
      t.type === "INCOME" ? "Income" : "Expense",
      minorToDecimalString(t.amountMinor),
      t.category.name,
      t.description,
      t.type === "INCOME" ? "" : t.paymentMethod,
      t.notes ?? "",
    ]),
  );

  const filename = `ledgerly-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
