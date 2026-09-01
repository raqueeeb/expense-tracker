export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-label="Loading">
      <div className="h-7 w-40 rounded bg-surface-line/70 dark:bg-night-line" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-card bg-surface-line/70 dark:bg-night-line" />
        ))}
      </div>
      <div className="h-64 rounded-card bg-surface-line/70 dark:bg-night-line" />
    </div>
  );
}
