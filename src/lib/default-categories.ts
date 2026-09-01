export const DEFAULT_EXPENSE_CATEGORIES = [
  "Food", "Transport", "Shopping", "Bills", "Entertainment",
  "Health", "Education", "Travel", "Housing", "Subscriptions", "Other",
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  "Salary", "Freelance", "Business", "Investment", "Gift", "Other",
] as const;

export function defaultCategoryRows(userId: string) {
  return [
    ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ userId, name, type: "EXPENSE" as const, isSystem: true })),
    ...DEFAULT_INCOME_CATEGORIES.map((name) => ({ userId, name, type: "INCOME" as const, isSystem: true })),
  ];
}
