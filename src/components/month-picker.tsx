"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";

/** Month selection lives in the URL so a view can be shared, bookmarked and refreshed. */
export function MonthPicker({ value, label }: { value: string; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const go = (next: string) => {
    const q = new URLSearchParams(params.toString());
    q.set("m", next);
    q.delete("page");
    router.push(`${pathname}?${q.toString()}`);
  };

  const shift = (delta: number) => {
    const [y, m] = value.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    go(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="secondary" size="sm" aria-label="Previous month" onClick={() => shift(-1)}>
        <ChevronLeft size={15} aria-hidden />
      </Button>
      <label className="sr-only" htmlFor="month">
        Month
      </label>
      <input
        id="month"
        type="month"
        value={value}
        onChange={(e) => e.target.value && go(e.target.value)}
        aria-label={`Showing ${label}`}
        className="h-8 rounded-md border border-surface-line bg-surface px-2 text-sm num dark:border-night-line dark:bg-night dark:text-slate-100"
      />
      <Button variant="secondary" size="sm" aria-label="Next month" onClick={() => shift(1)}>
        <ChevronRight size={15} aria-hidden />
      </Button>
    </div>
  );
}
