"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-lg font-semibold">This page did not load</h1>
      <p className="max-w-sm text-sm text-ink-soft dark:text-slate-400">
        The request failed before we could show your data. Nothing was changed.
      </p>
      <button onClick={reset} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white">
        Try again
      </button>
    </div>
  );
}
