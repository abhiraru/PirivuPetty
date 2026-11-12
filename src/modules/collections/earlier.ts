type Festival = { id: string; name: string; year: number };
type Pledge = { festivalId: string; amount: number };
export type EarlierPayment = {
  id: string;
  festivalId: string;
  amount: number;
  status: "VALID" | "VOIDED";
  mode: "CASH" | "CHEQUE" | "ONLINE";
  imported: boolean;
  collectedOn: Date;
  collector: { name: string } | null;
  txnId: string | null;
  chequeNo: string | null;
};

export type EarlierYear = { year: number; festivalName: string; pledge: number | null; paid: number; payments: EarlierPayment[] };

/** One entry per earlier festival, newest first, including years the household gave nothing. Voided payments are left out. */
export function groupEarlierYears(input: { currentYear: number; festivals: Festival[]; pledges: Pledge[]; collections: EarlierPayment[] }): EarlierYear[] {
  return input.festivals
    .filter((f) => f.year < input.currentYear)
    .sort((a, b) => b.year - a.year)
    .map((f) => {
      const payments = input.collections
        .filter((c) => c.festivalId === f.id && c.status === "VALID")
        .sort((a, b) => a.collectedOn.getTime() - b.collectedOn.getTime());
      return {
        year: f.year,
        festivalName: f.name,
        pledge: input.pledges.find((p) => p.festivalId === f.id)?.amount ?? null,
        paid: payments.reduce((s, c) => s + c.amount, 0),
        payments,
      };
    });
}
