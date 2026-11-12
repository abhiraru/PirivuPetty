/** Shared paging maths for every long list. Pure, so it can be tested. */

export const PAGE_SIZES = [25, 50, 100] as const;
export const DEFAULT_SIZE = 25;

export type PageWindow = { page: number; pages: number; size: number; total: number; from: number; to: number; skip: number };

export function paginate(total: number, page: number, size: number): PageWindow {
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(Math.floor(page) || 1, 1), pages);
  const skip = (p - 1) * size;
  return { page: p, pages, size, total, from: total === 0 ? 0 : skip + 1, to: Math.min(skip + size, total), skip };
}

export function parsePage(v: string | undefined): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function parseSize(v: string | undefined): number {
  const n = Number(v);
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_SIZE;
}
