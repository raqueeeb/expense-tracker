import { PrismaClient, type TxType, type PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@ledgerly.app";
const DEMO_PASSWORD = "demo12345";

const EXPENSE_CATEGORIES = [
  "Food", "Transport", "Shopping", "Bills", "Entertainment",
  "Health", "Education", "Travel", "Housing", "Subscriptions", "Other",
];
const INCOME_CATEGORIES = ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"];

/** rupees -> paise */
const r = (rupees: number) => Math.round(rupees * 100);

type Draft = {
  type: TxType;
  amount: number;
  category: string;
  description: string;
  day: number;
  method?: PaymentMethod;
};

const monthlyDrafts: Draft[] = [
  { type: "INCOME", amount: 60000, category: "Salary", description: "Monthly salary", day: 1 },
  { type: "INCOME", amount: 10000, category: "Freelance", description: "Website build for a client", day: 12 },
  { type: "EXPENSE", amount: 7500, category: "Bills", description: "Electricity and internet", day: 5, method: "NETBANKING" },
  { type: "EXPENSE", amount: 5500, category: "Food", description: "Groceries for the month", day: 6, method: "UPI" },
  { type: "EXPENSE", amount: 1250, category: "Food", description: "Dinner out", day: 14, method: "CARD" },
  { type: "EXPENSE", amount: 2000, category: "Transport", description: "Metro card top-up", day: 8, method: "UPI" },
  { type: "EXPENSE", amount: 4000, category: "Shopping", description: "Running shoes", day: 17, method: "CARD" },
  { type: "EXPENSE", amount: 2500, category: "Entertainment", description: "Concert tickets", day: 21, method: "CARD" },
  { type: "EXPENSE", amount: 649, category: "Subscriptions", description: "Streaming plan", day: 3, method: "CARD" },
  { type: "EXPENSE", amount: 1800, category: "Health", description: "Pharmacy", day: 24, method: "CASH" },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demo data in production.");
  }

  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } }); // cascades

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo User",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
      currency: "INR",
    },
  });

  await prisma.category.createMany({
    data: [
      ...EXPENSE_CATEGORIES.map((name) => ({ userId: user.id, name, type: "EXPENSE" as const, isSystem: true })),
      ...INCOME_CATEGORIES.map((name) => ({ userId: user.id, name, type: "INCOME" as const, isSystem: true })),
    ],
  });

  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const idFor = (name: string, type: TxType) =>
    categories.find((c) => c.name === name && c.type === type)!.id;

  const now = new Date();
  const transactions = [];
  // Three months of history so the trend chart and month switcher have data.
  for (let back = 2; back >= 0; back--) {
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    // Vary the amounts slightly per month so the trend is not a flat line.
    const factor = 1 + (2 - back) * 0.07;
    for (const d of monthlyDrafts) {
      transactions.push({
        userId: user.id,
        type: d.type,
        amountMinor: r(Math.round(d.amount * (d.type === "EXPENSE" ? factor : 1))),
        categoryId: idFor(d.category, d.type),
        description: d.description,
        date: new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), d.day)),
        paymentMethod: d.type === "INCOME" ? ("OTHER" as const) : (d.method ?? "CASH"),
        notes: null,
      });
    }
  }
  await prisma.transaction.createMany({ data: transactions });

  for (let back = 2; back >= 0; back--) {
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    await prisma.budget.create({
      data: {
        userId: user.id,
        year: base.getUTCFullYear(),
        month: base.getUTCMonth() + 1,
        amountMinor: r(50000),
      },
    });
  }

  console.log(`Seeded ${transactions.length} transactions.`);
  console.log(`Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
