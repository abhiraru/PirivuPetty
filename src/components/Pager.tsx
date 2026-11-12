import Link from "next/link";
import { btn } from "./ui/btn";
import { Icon } from "./ui/Icon";

type Params = Record<string, string | undefined>;

function href(pathname: string, params: Params, pageKey: string, page: number) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== pageKey) q.set(k, v);
  if (page > 1) q.set(pageKey, String(page));
  const s = q.toString();
  return s ? `${pathname}?${s}` : pathname;
}

/** "Showing 26-50 of 140" with Previous / Next. Keeps every other filter in the address. */
export function Pager({ pathname, params, pageKey = "page", page, pages, total, from, to }: { pathname: string; params: Params; pageKey?: string; page: number; pages: number; total: number; from: number; to: number }) {
  if (total === 0) return null;
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm print:hidden">
      <span className="text-gray-500">Showing {from}–{to} of {total}</span>
      {pages > 1 && (
        <span className="flex items-center gap-2">
          <Link href={href(pathname, params, pageKey, page - 1)} aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} className={btn("secondary", "sm")}><Icon name="back" />Previous</Link>
          <span className="tabular-nums text-gray-500">Page {page} of {pages}</span>
          <Link href={href(pathname, params, pageKey, page + 1)} aria-disabled={page >= pages} tabIndex={page >= pages ? -1 : undefined} className={btn("secondary", "sm")}>Next<Icon name="arrow" /></Link>
        </span>
      )}
    </nav>
  );
}
