import Link from "next/link";
import { signOut } from "@/lib/auth";
import { Logo } from "./Logo";
import { btn } from "./ui/btn";
import { Icon } from "./ui/Icon";
import { BottomTabs, type TabItem } from "./BottomTabs";
import { NavLinks, type NavItem } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

export function AppShell({ title, userName, links = [], bottomTabs, children }: { title: string; userName: string; links?: NavItem[]; bottomTabs?: TabItem[]; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-extrabold">
            <Logo size={30} />
            <span className="tracking-[0.08em]">PIRIVUPETTY</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">{title}</span>
          </Link>
          <div className={`order-last w-full min-w-0 md:order-none md:w-auto md:flex-1 ${bottomTabs ? "hidden md:block" : ""}`}>
            <NavLinks items={links} />
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <ThemeToggle />
            <Link href="/account" className="flex items-center gap-2 rounded-full" title="My account" aria-label="My account">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-bold text-[#1a1103]">{initials(userName)}</span>
              <span className="hidden 2xl:inline">{userName}</span>
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className={btn("secondary", "sm")}>
                <Icon name="out" />
                <span className="hidden xl:inline">Sign out</span>
                <span className="sr-only xl:hidden">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className={`mx-auto max-w-6xl px-4 py-6 ${bottomTabs ? "pb-28 md:pb-6" : ""}`}>{children}</main>
      {bottomTabs && <BottomTabs items={bottomTabs} />}
    </div>
  );
}
