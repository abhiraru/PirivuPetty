import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import type { TabItem } from "@/components/BottomTabs";
import { getCurrentUser } from "@/lib/auth";

const LINKS = [
  { href: "/collector", label: "Dashboard", exact: true },
  { href: "/collector/households", label: "Households" },
  { href: "/collector/handover", label: "Hand over cash" },
];

// The same places as a thumb-reach bar on phones.
const TABS: TabItem[] = [
  { href: "/collector", label: "Home", icon: "home", exact: true },
  { href: "/collector/households", label: "Households", icon: "users" },
  { href: "/collector/handover", label: "Hand over", icon: "wallet" },
  { href: "/account", label: "Account", icon: "user" },
];

export default async function CollectorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "COLLECTOR") redirect("/");
  return (
    <AppShell title="Collector" userName={user.name} links={LINKS} bottomTabs={TABS}>
      {children}
    </AppShell>
  );
}
