import { z } from "zod";
import { parseAmountToMinor } from "./money";

/** Accepts what a text input actually produces and converts to minor units. */
const amountField = z
  .string()
  .trim()
  .min(1, "Enter an amount")
  .transform((v, ctx) => {
    const minor = parseAmountToMinor(v);
    if (minor === null) {
      ctx.addIssue({ code: "custom", message: "Use a number with up to 2 decimals" });
      return z.NEVER;
    }
    if (minor <= 0) {
      ctx.addIssue({ code: "custom", message: "Amount must be greater than zero" });
      return z.NEVER;
    }
    if (minor > 100_000_000_00) {
      ctx.addIssue({ code: "custom", message: "Amount is too large" });
      return z.NEVER;
    }
    return minor;
  });

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), "Use a valid date");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters").max(200),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const txTypeEnum = z.enum(["INCOME", "EXPENSE"]);
export const paymentMethodEnum = z.enum(["CASH", "CARD", "UPI", "NETBANKING", "WALLET", "OTHER"]);

export const transactionSchema = z.object({
  type: txTypeEnum,
  amount: amountField,
  categoryId: z.string().min(1, "Choose a category"),
  description: z.string().trim().min(1, "Add a short description").max(120),
  date: dateField,
  paymentMethod: paymentMethodEnum.default("CASH"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const transactionUpdateSchema = transactionSchema.extend({
  id: z.string().min(1),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(40),
  type: txTypeEnum,
});

export const budgetSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  amount: amountField,
});

export const settingsSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  currency: z.enum(["INR", "USD"]),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Password must be at least 8 characters").max(200),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type TransactionInput = z.input<typeof transactionSchema>;
