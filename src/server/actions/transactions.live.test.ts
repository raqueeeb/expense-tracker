/**
 * Integration tests against a REAL PostgreSQL database.
 *
 * Everything else in this suite is a unit test that never touches Postgres.
 * These exist because the two most important claims in this codebase cannot be
 * proved any other way:
 *
 *   1. Money survives the client -> server -> database round trip as an exact
 *      integer. A unit test on the payload builder proves the FormData is
 *      right; it cannot prove what integer reached the "amountMinor" column.
 *   2. One user cannot read or modify another user's rows. The queries are
 *      written correctly, but "written correctly" and "verified" differ.
 *
 * They skip themselves when DATABASE_URL is absent or the server is
 * unreachable, so `npm test` stays green on a machine with no database.
 *
 * Run explicitly with:  npx vitest run src/server/actions/transactions.live.test.ts
 */
import { readFileSync } from "node:fs";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * Vitest does not read .env (only the Prisma CLI and Next do), so DATABASE_URL
 * is loaded here. Deliberately dependency-free: `dotenv` is only a transitive
 * dependency in this project and relying on it would break silently if the
 * dependency tree changed. Existing environment variables always win.
 */
function loadEnvFile(path = ".env") {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1];
    if (process.env[key] !== undefined) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
loadEnvFile();
import { transactionSchema } from "@/lib/validation";
import { buildTransactionFormData } from "@/lib/transaction-payload";
import { minorToDecimalString } from "@/lib/money";
import { toCsv } from "@/lib/csv";

// The action calls revalidatePath, which needs a Next request scope.
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

// requireUser() reads the signed session cookie. There is no cookie in a test
// runner, so the identity is injected here -- and ONLY the identity. Everything
// downstream (ownership checks, WHERE clauses, the write itself) is the real
// production code path running against the real database.
const currentUser = { id: "", name: "", email: "", currency: "INR" as const };
vi.mock("@/lib/session", () => ({
  requireUser: async () => currentUser,
  getOptionalUser: async () => currentUser,
}));

const prisma = new PrismaClient();

let reachable = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  reachable = Boolean(process.env.DATABASE_URL);
} catch {
  reachable = false;
}

const suite = reachable ? describe : describe.skip;

// Imported after the mocks are registered.
const { createTransaction, updateTransaction, deleteTransaction } = await import("./transactions");
const { getMonthSummary, getCategoryBreakdown, getMonthlyTrend, listTransactions, buildTransactionWhere } =
  await import("@/lib/queries");

const A_EMAIL = "itest-alice@example.test";
const B_EMAIL = "itest-bob@example.test";

type Ctx = { userId: string; expenseCatId: string; incomeCatId: string };

async function makeUser(email: string): Promise<Ctx> {
  await prisma.user.deleteMany({ where: { email } });
  const user = await prisma.user.create({
    data: { email, name: "Integration Test", passwordHash: "x", currency: "INR" },
  });
  const expense = await prisma.category.create({
    data: { userId: user.id, name: "Food", type: "EXPENSE" },
  });
  const income = await prisma.category.create({
    data: { userId: user.id, name: "Salary", type: "INCOME" },
  });
  return { userId: user.id, expenseCatId: expense.id, incomeCatId: income.id };
}

/** Reproduces exactly what the browser does: resolver transform, then payload build. */
function formDataAsBrowserWouldSend(typed: string, ctx: Ctx, date: string) {
  const values = transactionSchema.parse({
    type: "EXPENSE",
    amount: typed,
    categoryId: ctx.expenseCatId,
    description: "Priority round-trip test",
    date,
    paymentMethod: "UPI",
    notes: "",
  });
  return { values, fd: buildTransactionFormData(values) };
}

let alice: Ctx;
let bob: Ctx;

beforeAll(async () => {
  if (!reachable) return;
  alice = await makeUser(A_EMAIL);
  bob = await makeUser(B_EMAIL);
});

afterAll(async () => {
  if (reachable) {
    await prisma.user.deleteMany({ where: { email: { in: [A_EMAIL, B_EMAIL] } } });
  }
  await prisma.$disconnect();
});

suite("money round trip (the 100x bug)", () => {
  it("stores Rs 450.00 as exactly 45000 in the amountMinor column", async () => {
    Object.assign(currentUser, { id: alice.userId, email: A_EMAIL });

    const { values, fd } = formDataAsBrowserWouldSend("450.00", alice, "2026-09-02");

    // The resolver has already produced minor units...
    expect(values.amount).toBe(45000);
    // ...but the wire format must be the decimal string, or the server doubles it.
    expect(fd.get("amount")).toBe("450.00");

    const result = await createTransaction({ ok: false }, fd);
    expect(result.ok).toBe(true);

    // Read back with raw SQL, bypassing Prisma's mapping entirely.
    const rows = await prisma.$queryRaw<{ amountMinor: number }[]>`
      SELECT "amountMinor" FROM "Transaction"
      WHERE "userId" = ${alice.userId} AND "description" = 'Priority round-trip test'
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].amountMinor).toBe(45000);
    expect(rows[0].amountMinor).not.toBe(4_500_000);
  });

  it("shows Rs 450.00 on the dashboard, in analytics, and in the CSV export", async () => {
    Object.assign(currentUser, { id: alice.userId, email: A_EMAIL });
    const key = { year: 2026, month: 9 };

    const summary = await getMonthSummary(alice.userId, key);
    expect(summary.expenses).toBe(45000);
    expect(minorToDecimalString(summary.expenses)).toBe("450.00");

    const breakdown = await getCategoryBreakdown(alice.userId, key, "EXPENSE");
    expect(breakdown.find((c) => c.name === "Food")?.total).toBe(45000);

    const rows = await prisma.transaction.findMany({
      where: buildTransactionWhere(alice.userId, {}),
      include: { category: { select: { name: true } } },
    });
    const csv = toCsv(
      ["Date", "Type", "Amount", "Category"],
      rows.map((t) => [t.date.toISOString().slice(0, 10), t.type, minorToDecimalString(t.amountMinor), t.category.name]),
    );
    expect(csv).toContain("450.00");
    expect(csv).not.toContain("45000.00");
  });

  it("does not drift when the same amount is edited (update path)", async () => {
    Object.assign(currentUser, { id: alice.userId, email: A_EMAIL });
    const tx = await prisma.transaction.findFirstOrThrow({
      where: { userId: alice.userId, description: "Priority round-trip test" },
    });

    const values = transactionSchema.parse({
      type: "EXPENSE",
      amount: minorToDecimalString(tx.amountMinor), // re-render the form from stored value
      categoryId: alice.expenseCatId,
      description: "Priority round-trip test",
      date: "2026-09-02",
      paymentMethod: "UPI",
      notes: "",
    });
    const fd = buildTransactionFormData(values, tx.id);
    const result = await updateTransaction({ ok: false }, fd);
    expect(result.ok).toBe(true);

    const after = await prisma.transaction.findUniqueOrThrow({ where: { id: tx.id } });
    expect(after.amountMinor).toBe(45000);
  });

  it("stores a range of amounts exactly", async () => {
    Object.assign(currentUser, { id: alice.userId, email: A_EMAIL });
    const cases: [string, number][] = [
      ["0.01", 1],
      ["0.99", 99],
      ["1.00", 100],
      ["1234.56", 123456],
      ["99999.99", 9999999],
    ];
    for (const [typed, expected] of cases) {
      const values = transactionSchema.parse({
        type: "EXPENSE",
        amount: typed,
        categoryId: alice.expenseCatId,
        description: `amt ${typed}`,
        date: "2026-09-03",
        paymentMethod: "CASH",
        notes: "",
      });
      const r = await createTransaction({ ok: false }, buildTransactionFormData(values));
      expect(r.ok).toBe(true);
      const row = await prisma.transaction.findFirstOrThrow({
        where: { userId: alice.userId, description: `amt ${typed}` },
      });
      expect(row.amountMinor).toBe(expected);
    }
  });
});

suite("user isolation", () => {
  it("refuses a transaction posted with another user's categoryId", async () => {
    Object.assign(currentUser, { id: alice.userId, email: A_EMAIL });
    const values = transactionSchema.parse({
      type: "EXPENSE",
      amount: "10.00",
      categoryId: bob.expenseCatId, // Bob's category, submitted by Alice
      description: "cross-tenant category",
      date: "2026-09-02",
      paymentMethod: "CASH",
      notes: "",
    });
    const result = await createTransaction({ ok: false }, buildTransactionFormData(values));

    expect(result.ok).toBe(false);
    const leaked = await prisma.transaction.findFirst({ where: { description: "cross-tenant category" } });
    expect(leaked).toBeNull();
  });

  it("refuses to update another user's transaction", async () => {
    Object.assign(currentUser, { id: bob.userId, email: B_EMAIL });
    const bobsTx = await prisma.transaction.create({
      data: {
        userId: bob.userId,
        type: "EXPENSE",
        amountMinor: 12345,
        categoryId: bob.expenseCatId,
        description: "bob private",
        date: new Date("2026-09-02T00:00:00Z"),
        paymentMethod: "CASH",
      },
    });

    Object.assign(currentUser, { id: alice.userId, email: A_EMAIL });
    const values = transactionSchema.parse({
      type: "EXPENSE",
      amount: "1.00",
      categoryId: alice.expenseCatId,
      description: "hijacked",
      date: "2026-09-02",
      paymentMethod: "CASH",
      notes: "",
    });
    const result = await updateTransaction({ ok: false }, buildTransactionFormData(values, bobsTx.id));
    expect(result.ok).toBe(false);

    const untouched = await prisma.transaction.findUniqueOrThrow({ where: { id: bobsTx.id } });
    expect(untouched.amountMinor).toBe(12345);
    expect(untouched.description).toBe("bob private");
  });

  it("refuses to delete another user's transaction", async () => {
    const bobsTx = await prisma.transaction.findFirstOrThrow({ where: { description: "bob private" } });
    Object.assign(currentUser, { id: alice.userId, email: A_EMAIL });

    const fd = new FormData();
    fd.set("id", bobsTx.id);
    const result = await deleteTransaction({ ok: false }, fd);
    expect(result.ok).toBe(false);

    expect(await prisma.transaction.findUnique({ where: { id: bobsTx.id } })).not.toBeNull();
  });

  it("never returns another user's rows through the export filter", async () => {
    // Alice exporting, deliberately filtering by Bob's category id.
    const rows = await prisma.transaction.findMany({
      where: buildTransactionWhere(alice.userId, { categoryId: bob.expenseCatId }),
    });
    expect(rows).toHaveLength(0);

    const all = await prisma.transaction.findMany({ where: buildTransactionWhere(alice.userId, {}) });
    expect(all.every((r) => r.userId === alice.userId)).toBe(true);
    expect(all.some((r) => r.description === "bob private")).toBe(false);
  });

  it("scopes listTransactions and getMonthSummary per user", async () => {
    const aliceList = await listTransactions(alice.userId, {});
    expect(aliceList.rows.every((r) => r.userId === alice.userId)).toBe(true);

    const bobSummary = await getMonthSummary(bob.userId, { year: 2026, month: 9 });
    expect(bobSummary.expenses).toBe(12345);

    const aliceSummary = await getMonthSummary(alice.userId, { year: 2026, month: 9 });
    expect(aliceSummary.expenses).not.toBe(bobSummary.expenses);
  });
});

suite("getMonthlyTrend against real data", () => {
  it("buckets rows into the correct months and converts bigint sums exactly", async () => {
    Object.assign(currentUser, { id: alice.userId, email: A_EMAIL });

    // One expense in each of three consecutive months, plus a boundary row on
    // the first day of the window and one on the last day of a month.
    const seed: [string, number][] = [
      ["2026-07-01", 10000], // first day of a month
      ["2026-07-31", 20000], // last day of a month
      ["2026-08-15", 30000],
      ["2026-09-30", 40000], // last day of the end month
    ];
    for (const [date, minor] of seed) {
      await prisma.transaction.create({
        data: {
          userId: alice.userId,
          type: "EXPENSE",
          amountMinor: minor,
          categoryId: alice.expenseCatId,
          description: `trend ${date}`,
          date: new Date(`${date}T00:00:00Z`),
          paymentMethod: "CASH",
        },
      });
    }

    const trend = await getMonthlyTrend(alice.userId, { year: 2026, month: 9 }, 6);

    expect(trend).toHaveLength(6);
    expect(trend.map((p) => p.key)).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
    ]);

    const by = Object.fromEntries(trend.map((p) => [p.key, p]));

    // Both July rows land in July: 10000 + 20000. This is the boundary check --
    // the "date" column is DATE but the query binds timestamps, so a timezone
    // shift would move the 1st or the 31st into an adjacent bucket.
    expect(by["2026-07"].expenses).toBe(30000);
    expect(by["2026-08"].expenses).toBe(30000);

    // Months with no activity are zero-filled, not missing.
    expect(by["2026-04"].expenses).toBe(0);
    expect(by["2026-05"].expenses).toBe(0);

    // Every value is a JS number, not a BigInt that would break arithmetic.
    for (const p of trend) {
      expect(typeof p.income).toBe("number");
      expect(typeof p.expenses).toBe("number");
      expect(Number.isSafeInteger(p.expenses)).toBe(true);
    }

    // September holds the 45000 round-trip row, the small amounts, and 40000.
    expect(by["2026-09"].expenses).toBeGreaterThan(0);
  });

  it("separates income from expenses in the same bucket", async () => {
    await prisma.transaction.create({
      data: {
        userId: alice.userId,
        type: "INCOME",
        amountMinor: 500000,
        categoryId: alice.incomeCatId,
        description: "trend income",
        date: new Date("2026-08-10T00:00:00Z"),
        paymentMethod: "OTHER",
      },
    });

    const trend = await getMonthlyTrend(alice.userId, { year: 2026, month: 9 }, 6);
    const aug = trend.find((p) => p.key === "2026-08")!;
    expect(aug.income).toBe(500000);
    expect(aug.expenses).toBe(30000);
  });

  it("excludes rows outside the requested window", async () => {
    const sum = (t: { expenses: number }[]) => t.reduce((n, p) => n + p.expenses, 0);

    const before = sum(await getMonthlyTrend(alice.userId, { year: 2026, month: 9 }, 6));

    await prisma.transaction.create({
      data: {
        userId: alice.userId,
        type: "EXPENSE",
        amountMinor: 777700,
        categoryId: alice.expenseCatId,
        description: "way outside the window",
        date: new Date("2025-01-15T00:00:00Z"),
        paymentMethod: "CASH",
      },
    });

    const after = await getMonthlyTrend(alice.userId, { year: 2026, month: 9 }, 6);

    // A row 20 months before the window must not shift any bucket at all.
    expect(sum(after)).toBe(before);
    expect(after.every((p) => p.expenses !== 777700)).toBe(true);

    // But it IS visible when the window is widened to reach it.
    const wide = await getMonthlyTrend(alice.userId, { year: 2026, month: 9 }, 24);
    expect(wide.find((p) => p.key === "2025-01")?.expenses).toBe(777700);
  });
});
