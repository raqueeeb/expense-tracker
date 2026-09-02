import { minorToDecimalString } from "./money";
import type { transactionSchema } from "./validation";
import type { z } from "zod";

/** What the client-side zodResolver hands to react-hook-form's submit handler. */
export type ParsedTransactionValues = z.output<typeof transactionSchema>;

/**
 * Serialise validated form values into the FormData a transaction server action
 * expects.
 *
 * The subtlety this function exists to contain: `transactionSchema` does not
 * merely validate the amount, it *transforms* it — "450.00" becomes 45000 minor
 * units. The client resolver has already applied that transform by the time the
 * submit handler runs, but the server action re-parses the FormData with the
 * very same schema. Posting the transformed number back would run the transform
 * twice and multiply every amount by 100.
 *
 * So the amount is converted back to its decimal string form here. The server
 * remains the authority on parsing: it receives the same shape of input a plain
 * HTML form would have sent, and its own validation is what decides the stored
 * value.
 *
 * Guarded by transaction-payload.test.ts.
 */
export function buildTransactionFormData(values: ParsedTransactionValues, id?: string): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    fd.set(key, String(value ?? ""));
  }
  fd.set("amount", minorToDecimalString(values.amount));
  if (id) fd.set("id", id);
  return fd;
}
