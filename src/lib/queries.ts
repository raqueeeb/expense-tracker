import { Prisma, type TxType } from "@prisma/client";
import { prisma } from "./prisma";
import { monthRange, type MonthKey } from "./month";

export {
  monthRange,
  currentMonth,
  parseMonthParam,
  monthParam,
  monthLabel,
  type MonthKey,
} from "./month";

/**
 * Totals are summed by Postgres, not in JavaScript: the dashboard stays correct
 * (and fast) no matter how many rows the user has.
 */
export async function getMonthSummary(userId: string, key: MonthKey) {
  const { start, end } = monthRange(key);

  const [grouped, budget, allTime] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId, date: { gte: start, lt: end } },
      _sum: { amountMinor: true },
    }),
    prisma.budget.findUnique({
      where: { userId_year_month: { userId, year: key.year, month: key.month } },
      select: { amountMinor: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId },
      _sum: { amountMinor: true },
    }),
  ]);

  const pick = (rows: typeof grouped, type: TxType) =>
    rows.find((r) => r.type === type)?._sum.amountMinor ?? 0;

  const income = pick(grouped, "INCOME");
  const expenses = pick(grouped, "EXPENSE");
  const budgetMinor = budget?.amountMinor ?? null;

  return {
    income,
    expenses,
    balance: income - expenses,
    budget: budgetMinor,
    // Positive => money left. Negative => over budget by that much.
    budgetRemaining: budgetMinor === null ? null : budgetMinor - expenses,
    lifetimeIncome: pick(allTime, "INCOME"),
    lifetimeExpenses: pick(allTime, "EXPENSE"),
    lifetimeBalance: pick(allTime, "INCOME") - pick(allTime, "EXPENSE"),
  };
}

export async function getRecentTransactions(userId: string, take = 6) {
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
    include: { category: { select: { name: true } } },
  });
}

export async function getCategoryBreakdown(userId: string, key: MonthKey, type: TxType = "EXPENSE") {
  const { start, end } = monthRange(key);
  const grouped = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, type, date: { gte: start, lt: end } },
    _sum: { amountMinor: true },
    orderBy: { _sum: { amountMinor: "desc" } },
  });
  if (grouped.length === 0) return [];

  const categories = await prisma.category.findMany({
    where: { userId, id: { in: grouped.map((g) => g.categoryId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  return grouped.map((g) => ({
    categoryId: g.categoryId,
    name: nameById.get(g.categoryId) ?? "Unknown",
    total: g._sum.amountMinor ?? 0,
  }));
}

export type TrendPoint = { key: string; label: string; income: number; expenses: number };

/**
 * Income vs expenses for the last `months` calendar months, aggregated with
 * date_trunc in Postgres. Months with no activity are filled with zeroes so the
 * chart has a continuous x-axis.
 */
export async function getMonthlyTrend(userId: string, endKey: MonthKey, months = 6): Promise<TrendPoint[]> {
  const { end } = monthRange(endKey);
  const start = new Date(Date.UTC(endKey.year, endKey.month - months, 1));

  const rows = await prisma.$queryRaw<{ bucket: Date; type: TxType; total: bigint }[]>(
    Prisma.sql`
      SELECT date_trunc('month', "date")::date AS bucket, "type", SUM("amountMinor")::bigint AS total
      FROM "Transaction"
      WHERE "userId" = ${userId} AND "date" >= ${start} AND "date" < ${end}
      GROUP BY bucket, "type"
      ORDER BY bucket ASC
    `,
  );

  const byBucket = new Map<string, { income: number; expenses: number }>();
  for (const row of rows) {
    const d = new Date(row.bucket);
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const entry = byBucket.get(k) ?? { income: 0, expenses: 0 };
    if (row.type === "INCOME") entry.income = Number(row.total);
    else entry.expenses = Number(row.total);
    byBucket.set(k, entry);
  }

  const out: TrendPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(endKey.year, endKey.month - 1 - i, 1));
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const v = byBucket.get(k) ?? { income: 0, expenses: 0 };
    out.push({
      key: k,
      label: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      income: v.income,
      expenses: v.expenses,
    });
  }
  return out;
}

export type TransactionFilters = {
  q?: string;
  type?: TxType | "ALL";
  categoryId?: string;
  from?: string;
  to?: string;
  sort?: "date" | "amount";
  dir?: "asc" | "desc";
  page?: number;
  perPage?: number;
};

export function buildTransactionWhere(userId: string, f: TransactionFilters): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { userId };
  if (f.type && f.type !== "ALL") where.type = f.type;
  if (f.categoryId) where.categoryId = f.categoryId;
  if (f.q) {
    where.OR = [
      { description: { contains: f.q, mode: "insensitive" } },
      { notes: { contains: f.q, mode: "insensitive" } },
      { category: { name: { contains: f.q, mode: "insensitive" } } },
    ];
  }
  const date: Prisma.DateTimeFilter = {};
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) date.gte = new Date(`${f.from}T00:00:00Z`);
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) date.lte = new Date(`${f.to}T00:00:00Z`);
  if (date.gte || date.lte) where.date = date;
  return where;
}

export async function listTransactions(userId: string, f: TransactionFilters) {
  const perPage = Math.min(Math.max(f.perPage ?? 15, 5), 100);
  const page = Math.max(f.page ?? 1, 1);
  const where = buildTransactionWhere(userId, f);
  const sortField = f.sort === "amount" ? "amountMinor" : "date";
  const dir = f.dir === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: [{ [sortField]: dir }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);

  return { rows, total, page, perPage, pageCount: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true, isSystem: true },
  });
}
