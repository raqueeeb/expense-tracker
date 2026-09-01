import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getOptionalUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-dvh flex-col justify-center px-5 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8">
          <p className="text-lg font-semibold tracking-tight">Ledgerly</p>
          <p className="mt-1 text-sm text-ink-soft dark:text-slate-400">
            Every rupee you earn and spend, in one running account.
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
