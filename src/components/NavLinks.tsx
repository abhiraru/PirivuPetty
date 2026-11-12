"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; exact?: boolean };

export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto" aria-label="Main">
      {items.map((i) => {
        const on = i.exact ? path === i.href : path === i.href || path.startsWith(`${i.href}/`);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={on ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${on ? "bg-hero text-hero-fg" : "text-gray-500 hover:bg-gray-100 hover:text-fg"}`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
