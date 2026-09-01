import { redirect } from "next/navigation";

/** /expenses and /income are saved views of the same ledger. */
export default function ExpensesPage() {
  redirect("/transactions?type=EXPENSE");
}
