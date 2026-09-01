"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, Receipt, Settings, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", Icon: Receipt },
  { href: "/budget", label: "Budget", Icon: Target },
  { href: "/analytics", label: "Analytics", Icon: BarChart3 },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="space-y-0.5">
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink-soft hover:bg-surface-sunk hover:text-ink dark:text-slate-400 dark:hover:bg-night-sunk dark:hover:text-slate-100",
              active && "bg-surface-sunk font-medium text-ink dark:bg-night-sunk dark:text-slate-100",
            )}
          >
            <Icon size={16} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-surface-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden dark:border-night-line dark:bg-night-sunk"
    >
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] text-ink-soft dark:text-slate-400",
              active && "text-brand dark:text-credit",
            )}
          >
            <Icon size={18} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
