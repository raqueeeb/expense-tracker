"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select } from "@/components/ui";
import type { CategoryOption } from "@/components/transaction-form";

/**
 * Filters are URL state, not component state: the server component re-runs the
 * query, so the browser back button and a shared link both behave correctly.
 */
export function TransactionFilters({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const push = (next: Record<string, string>) => {
    const merged = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) merged.set(k, v);
      else merged.delete(k);
    }
    merged.delete("page");
    router.push(`${pathname}?${merged.toString()}`);
  };

  // Debounce the search box so typing does not fire a query per keystroke.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => push({ q }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const type = params.get("type") ?? "ALL";
  const categoryId = params.get("categoryId") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const sort = params.get("sort") ?? "date";
  const dir = params.get("dir") ?? "desc";
  const hasFilters = Boolean(q || params.get("type") || categoryId || from || to);

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
      <div className="sm:col-span-2 lg:col-span-2">
        <label className="sr-only" htmlFor="q">Search transactions</label>
        <Input id="q" placeholder="Search description, notes or category" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div>
        <label className="sr-only" htmlFor="type">Type</label>
        <Select id="type" value={type} onChange={(e) => push({ type: e.target.value === "ALL" ? "" : e.target.value })}>
          <option value="ALL">Income and expenses</option>
          <option value="INCOME">Income only</option>
          <option value="EXPENSE">Expenses only</option>
        </Select>
      </div>

      <div>
        <label className="sr-only" htmlFor="categoryId">Category</label>
        <Select id="categoryId" value={categoryId} onChange={(e) => push({ categoryId: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.type === "INCOME" ? "income" : "expense"})
            </option>
          ))}
        </Select>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="sr-only" htmlFor="from">From date</label>
          <Input id="from" type="date" className="num" value={from} onChange={(e) => push({ from: e.target.value })} />
        </div>
        <div className="flex-1">
          <label className="sr-only" htmlFor="to">To date</label>
          <Input id="to" type="date" className="num" value={to} onChange={(e) => push({ to: e.target.value })} />
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="sr-only" htmlFor="sort">Sort by</label>
          <Select
            id="sort"
            value={`${sort}:${dir}`}
            onChange={(e) => {
              const [s, d] = e.target.value.split(":");
              push({ sort: s, dir: d });
            }}
          >
            <option value="date:desc">Newest first</option>
            <option value="date:asc">Oldest first</option>
            <option value="amount:desc">Largest amount</option>
            <option value="amount:asc">Smallest amount</option>
          </Select>
        </div>
        {hasFilters ? (
          <Button
            variant="secondary"
            onClick={() => {
              setQ("");
              router.push(pathname);
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
