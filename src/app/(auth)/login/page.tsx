import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — Ledgerly" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-ink-soft dark:text-slate-400">Pick up where your ledger left off.</p>
      <div className="mt-6">
        <LoginForm />
      </div>
      <p className="mt-6 text-sm text-ink-soft dark:text-slate-400">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-brand underline underline-offset-4">
          Create one
        </Link>
      </p>
    </div>
  );
}
