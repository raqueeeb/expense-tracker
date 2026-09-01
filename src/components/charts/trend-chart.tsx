"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney, type Currency } from "@/lib/money";

export type TrendDatum = { label: string; income: number; expenses: number };

export function TrendChart({ data, currency }: { data: TrendDatum[]; currency: Currency }) {
  return (
    <div className="h-72 w-full text-ink-soft dark:text-slate-400">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.2} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "currentColor" }} stroke="currentColor" />
          <YAxis
            tick={{ fontSize: 12, fill: "currentColor" }}
            stroke="currentColor"
            width={70}
            tickFormatter={(v: number) => formatMoney(Number(v ?? 0), currency).replace(/\.00$/, "")}
          />
          <Tooltip
            formatter={(value, name) => [
              formatMoney(Number(value ?? 0), currency),
              name === "income" ? "Income" : "Expenses",
            ]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => (v === "income" ? "Income" : "Expenses")} />
          <Bar dataKey="income" fill="#1f7a53" radius={[3, 3, 0, 0]} />
          <Bar dataKey="expenses" fill="#b3453a" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
