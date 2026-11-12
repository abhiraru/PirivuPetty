import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";

const LINKS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/fund", label: "Fund" },
  { href: "/admin/festivals", label: "Festivals" },
  { href: "/admin/areas", label: "Areas" },
  { href: "/admin/households", label: "Households" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/backup", label: "Backup" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");
  return (
    <AppShell title="Admin" userName={user.name} links={LINKS}>
      {children}
    </AppShell>
  );
}
