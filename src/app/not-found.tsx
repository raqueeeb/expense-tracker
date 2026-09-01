import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="text-sm text-ink-soft dark:text-slate-400">That address does not exist in Ledgerly.</p>
      <Link href="/dashboard" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white">
        Go to dashboard
      </Link>
    </div>
  );
}
