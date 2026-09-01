import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Create account — Ledgerly" };

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-ink-soft dark:text-slate-400">
        Your ledger starts empty and stays yours alone.
      </p>
      <div className="mt-6">
        <RegisterForm />
      </div>
      <p className="mt-6 text-sm text-ink-soft dark:text-slate-400">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-brand underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
