import { z } from "zod";

export type ActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  message?: string;
};

export const idleState: ActionState = { ok: false };

export function fromZodError(err: z.ZodError): ActionState {
  const flat = z.flattenError(err);
  return {
    ok: false,
    error: "Check the highlighted fields and try again.",
    fieldErrors: flat.fieldErrors as Record<string, string[]>,
  };
}

/** Never let a driver/stack message reach the browser. */
export function fromUnknownError(e: unknown, fallback = "Something went wrong. Try again."): ActionState {
  console.error(e);
  return { ok: false, error: fallback };
}
