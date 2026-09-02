import { describe, expect, it } from "vitest";
import { buildTransactionFormData } from "./transaction-payload";
import { transactionSchema } from "./validation";
import { parseAmountToMinor } from "./money";

/**
 * The client validates with transactionSchema and the server re-validates with
 * the same schema. Because the schema *transforms* the amount into minor units,
 * the value handed to the submit handler is already transformed. Posting it
 * back unchanged made the server transform it a second time, multiplying every
 * stored amount by 100.
 *
 * The invariant these tests lock down: whatever the user typed, the FormData the
 * client posts must re-parse on the server to exactly the minor units the user
 * meant.
 */
function roundTrip(typedAmount: string) {
  const clientParsed = transactionSchema.parse({
    type: "EXPENSE",
    amount: typedAmount,
    categoryId: "cat_1",
    description: "Groceries",
    date: "2026-09-01",
    paymentMethod: "CASH",
    notes: "",
  });

  const fd = buildTransactionFormData(clientParsed);
  const serverParsed = transactionSchema.parse(Object.fromEntries(fd));
  return { client: clientParsed.amount, server: serverParsed.amount };
}

describe("buildTransactionFormData", () => {
  it.each(["450.00", "1", "0.01", "99999.99", "1234.5", "7.30"])(
    "survives the client -> server round trip for %s",
    (typed) => {
      const intended = parseAmountToMinor(typed);
      const { client, server } = roundTrip(typed);

      expect(client).toBe(intended);
      // The regression: this was 100x the intended value.
      expect(server).toBe(intended);
    },
  );

  it("posts the amount as a decimal string, not as minor units", () => {
    const parsed = transactionSchema.parse({
      type: "EXPENSE",
      amount: "450.00",
      categoryId: "cat_1",
      description: "Groceries",
      date: "2026-09-01",
      paymentMethod: "CASH",
      notes: "",
    });

    expect(parsed.amount).toBe(45000);
    expect(buildTransactionFormData(parsed).get("amount")).toBe("450.00");
  });

  it("carries the id only when editing an existing transaction", () => {
    const parsed = transactionSchema.parse({
      type: "INCOME",
      amount: "10.00",
      categoryId: "cat_1",
      description: "Refund",
      date: "2026-09-01",
      paymentMethod: "OTHER",
      notes: "",
    });

    expect(buildTransactionFormData(parsed).has("id")).toBe(false);
    expect(buildTransactionFormData(parsed, "tx_9").get("id")).toBe("tx_9");
  });
});
