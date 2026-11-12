"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./ui/Icon";

export type TabItem = { href: string; label: string; icon: IconName; exact?: boolean };

/** Phone-only tab bar fixed to the bottom of the screen, within thumb reach. Hidden from tablet width up, where the top menu is used. */
export function BottomTabs({ items }: { items: TabItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur md:hidden print:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <ul className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((i) => {
          const on = i.exact ? path === i.href : path === i.href || path.startsWith(`${i.href}/`);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={on ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold ${on ? "text-link" : "text-gray-500"}`}>
                <span className={`grid h-7 w-12 place-items-center rounded-full ${on ? "bg-gray-100" : ""}`}>
                  <Icon name={i.icon} className="h-5 w-5 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]" />
                </span>
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
