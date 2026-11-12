import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/permissions";
import { PasswordForm } from "./PasswordForm";
import { PageHeader } from "@/components/PageHeader";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <AppShell title="My account" userName={user.name} links={[{ href: ROLE_HOME[user.role], label: "Back to my page", exact: true }]}>
      <PageHeader title="Change password" />
      <PasswordForm />
    </AppShell>
  );
}
