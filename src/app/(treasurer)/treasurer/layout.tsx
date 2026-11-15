import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";

const LINKS = [
  { href: "/treasurer", label: "Dashboard", exact: true },
  { href: "/treasurer/households", label: "Households" },
  { href: "/treasurer/handovers", label: "Handovers" },
  { href: "/treasurer/cheques", label: "Cheques" },
  { href: "/treasurer/bank", label: "Bank" },
  { href: "/treasurer/expenses", label: "Expenses" },
  { href: "/treasurer/income", label: "Other income" },
  { href: "/treasurer/year-end", label: "Year-end" },
  { href: "/treasurer/reports", label: "Reports" },
];

export default async function TreasurerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "TREASURER") redirect("/");
  return (
    <AppShell title="Treasurer" userName={user.name} links={LINKS}>
      {children}
    </AppShell>
  );
}
