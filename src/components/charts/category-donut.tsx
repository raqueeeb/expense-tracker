"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney, safePercent, type Currency } from "@/lib/money";
import { colorFor } from "./palette";

export type Slice = { name: string; total: number };

export function CategoryDonut({ data, currency }: { data: Slice[]; currency: Currency }) {
  const total = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="h-72 w-full text-ink-soft dark:text-slate-400">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={1} stroke="none">
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={colorFor(i)} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const minor = Number(value ?? 0);
              return [`${formatMoney(minor, currency)} (${safePercent(minor, total)}%)`, String(name ?? "")];
            }}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
