import { formatINR } from "@/lib/money";

/** What the treasurer actually counted at year-end, compared with what the app says. Pure, so it can be tested. */
export type ReconInput = { countedCash: number | null; countedBank: number | null; note: string | null };

export function reconcile(app: { cash: number; bank: number }, counts: ReconInput | null) {
  const entered = !!counts && counts.countedCash !== null && counts.countedBank !== null;
  const cashDiff = entered ? counts!.countedCash! - app.cash : null;
  const bankDiff = entered ? counts!.countedBank! - app.bank : null;
  return { entered, cashDiff, bankDiff, matches: entered && cashDiff === 0 && bankDiff === 0 };
}

const signed = (paise: number) => `${paise > 0 ? "+" : "-"}${formatINR(Math.abs(paise))}`;

/** Reasons the closing check stops the festival from being closed. */
export function reconBlockers(app: { cash: number; bank: number }, counts: ReconInput | null): string[] {
  const r = reconcile(app, counts);
  if (!r.entered) {
    return ["The treasurer has not done the closing check yet: the cash actually counted and the bank statement balance. It is on the Year-end page."];
  }
  if (r.matches) return [];
  if ((counts?.note ?? "").trim().length < 5) {
    const parts: string[] = [];
    if (r.cashDiff) parts.push(`cash ${signed(r.cashDiff)}`);
    if (r.bankDiff) parts.push(`bank ${signed(r.bankDiff)}`);
    return [`The counted money differs from the app (${parts.join(", ")}). Add a note explaining the difference on the Year-end page, or correct the records first.`];
  }
  return [];
}
