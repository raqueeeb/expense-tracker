import { requireUser } from "@/lib/session";
import { getCategories } from "@/lib/queries";
import { logoutAction } from "@/server/actions/auth";
import { CategoryManager, PasswordForm, ProfileForm } from "@/components/settings-forms";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, Card, CardHeader } from "@/components/ui";

export const metadata = { title: "Settings — Ledgerly" };

export default async function SettingsPage() {
  const user = await requireUser();
  const categories = await getCategories(user.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-ink-soft dark:text-slate-400">Your account, currency and categories.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profile" description="How your account and amounts are shown" />
          <div className="p-4">
            <ProfileForm name={user.name} email={user.email} currency={user.currency} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Password" description="Change the password you sign in with" />
          <div className="p-4">
            <PasswordForm />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Categories" description="Built-in categories stay; the ones you add can be removed" />
        <div className="p-4">
          <CategoryManager categories={categories} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Appearance" description="Light, dark, or follow your system" />
        <div className="p-4">
          <ThemeToggle />
        </div>
      </Card>

      <Card>
        <CardHeader title="Session" description="Signed in as this device" />
        <div className="p-4">
          <form action={logoutAction}>
            <Button type="submit" variant="secondary">Sign out</Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
