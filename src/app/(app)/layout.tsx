import { LogOut } from "lucide-react";
import { requireUser } from "@/lib/session";
import { logoutAction } from "@/server/actions/auth";
import { BottomNav, SidebarNav } from "@/components/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui";

/**
 * Every route under this layout is behind requireUser(), which redirects to
 * /login when there is no valid session. Route protection is server-side, so
 * disabling JavaScript or editing client state cannot reveal a dashboard.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh md:flex">
      <aside className="hidden w-56 shrink-0 border-r border-surface-line bg-surface px-3 py-5 md:flex md:flex-col dark:border-night-line dark:bg-night-sunk">
        <div className="px-2.5 pb-6">
          <p className="text-base font-semibold tracking-tight">Ledgerly</p>
          <p className="mt-0.5 truncate text-xs text-ink-soft dark:text-slate-400">{user.email}</p>
        </div>
        <SidebarNav />
        <form action={logoutAction} className="mt-auto pt-6">
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
            <LogOut size={15} aria-hidden />
            Sign out
          </Button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-surface-line bg-surface px-4 py-3 md:hidden dark:border-night-line dark:bg-night-sunk">
          <p className="text-base font-semibold tracking-tight">Ledgerly</p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm" aria-label="Sign out">
                <LogOut size={16} aria-hidden />
              </Button>
            </form>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10 md:pt-8">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
