import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Client = Prisma.TransactionClient | typeof db;

/** Raw sums for one festival, all in paise. Every balance is derived from these. */
export type BalanceInputs = {
  openingCash: number;
  openingBank: number;
  directCash: number; // cash taken straight by the treasurer
  collectorCash: Record<string, number>; // cash taken by each collector
  confirmedHandovers: Record<string, number>;
  pendingHandovers: Record<string, number>;
  online: number;
  chequeReceived: number;
  chequeDeposited: number;
  chequeCleared: number;
  cashDeposits: number; // cash -> bank
  withdrawals: number; // bank -> cash
  cashExpenses: number;
  bankExpenses: number;
  incomeCash: number; // other income received in cash (not from households)
  incomeBank: number; // other income received in the bank, e.g. interest
};

export type Balances = {
  cashInHand: number;
  bank: number;
  netFund: number;
  chequesNotCleared: number;
  collectorHoldings: { collectorId: string; holding: number; pending: number }[];
  totalWithCollectors: number;
  totalPendingHandovers: number;
  collectedTotal: number;
  /** Money from other sources (bank interest, sponsorship...), not from households. */
  otherIncome: number;
  spentTotal: number;
  /** Cash a collector could still hand over, after confirmed and requested handovers. */
  available: Record<string, number>;
};

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

export function computeBalances(i: BalanceInputs): Balances {
  const confirmedTotal = sum(i.confirmedHandovers);
  const cashInHand = i.openingCash + i.directCash + confirmedTotal - i.cashDeposits + i.withdrawals - i.cashExpenses + i.incomeCash;
  const bank = i.openingBank + i.online + i.chequeCleared + i.cashDeposits - i.withdrawals - i.bankExpenses + i.incomeBank;

  const ids = new Set([...Object.keys(i.collectorCash), ...Object.keys(i.confirmedHandovers), ...Object.keys(i.pendingHandovers)]);
  const collectorHoldings = [...ids].map((collectorId) => ({
    collectorId,
    holding: (i.collectorCash[collectorId] ?? 0) - (i.confirmedHandovers[collectorId] ?? 0),
    pending: i.pendingHandovers[collectorId] ?? 0,
  }));
  const available: Record<string, number> = {};
  for (const c of collectorHoldings) available[c.collectorId] = c.holding - c.pending;

  const chequesNotCleared = i.chequeReceived + i.chequeDeposited;
  return {
    cashInHand,
    bank,
    netFund: cashInHand + bank,
    chequesNotCleared,
    collectorHoldings,
    totalWithCollectors: collectorHoldings.reduce((a, c) => a + c.holding, 0),
    totalPendingHandovers: sum(i.pendingHandovers),
    collectedTotal: i.directCash + sum(i.collectorCash) + i.online + chequesNotCleared + i.chequeCleared,
    otherIncome: i.incomeCash + i.incomeBank,
    spentTotal: i.cashExpenses + i.bankExpenses,
    available,
  };
}

export async function loadBalanceInputs(client: Client, festivalId: string): Promise<BalanceInputs> {
  const festival = await client.festival.findUniqueOrThrow({ where: { id: festivalId } });
  const [collections, handovers, bankTxns, expenses, income] = await Promise.all([
    client.collection.groupBy({
      by: ["mode", "collectorId", "chequeStatus"],
      where: { festivalId, status: "VALID" },
      _sum: { amount: true },
    }),
    client.handover.groupBy({ by: ["collectorId", "status"], where: { festivalId }, _sum: { amount: true } }),
    client.bankTransaction.groupBy({ by: ["type"], where: { festivalId }, _sum: { amount: true } }),
    client.expense.groupBy({ by: ["paidFrom"], where: { festivalId, status: "VALID" }, _sum: { amount: true } }),
    client.otherIncome.groupBy({ by: ["receivedIn"], where: { festivalId, status: "VALID" }, _sum: { amount: true } }),
  ]);

  const inputs: BalanceInputs = {
    openingCash: festival.openingCash,
    openingBank: festival.openingBank,
    directCash: 0,
    collectorCash: {},
    confirmedHandovers: {},
    pendingHandovers: {},
    online: 0,
    chequeReceived: 0,
    chequeDeposited: 0,
    chequeCleared: 0,
    cashDeposits: 0,
    withdrawals: 0,
    cashExpenses: 0,
    bankExpenses: 0,
    incomeCash: 0,
    incomeBank: 0,
  };

  for (const c of collections) {
    const amt = c._sum.amount ?? 0;
    if (c.mode === "ONLINE") inputs.online += amt;
    else if (c.mode === "CHEQUE") {
      if (c.chequeStatus === "CLEARED") inputs.chequeCleared += amt;
      else if (c.chequeStatus === "DEPOSITED") inputs.chequeDeposited += amt;
      else inputs.chequeReceived += amt;
    } else if (c.collectorId) inputs.collectorCash[c.collectorId] = (inputs.collectorCash[c.collectorId] ?? 0) + amt;
    else inputs.directCash += amt;
  }
  for (const h of handovers) {
    const amt = h._sum.amount ?? 0;
    if (h.status === "CONFIRMED") inputs.confirmedHandovers[h.collectorId] = (inputs.confirmedHandovers[h.collectorId] ?? 0) + amt;
    else if (h.status === "PENDING") inputs.pendingHandovers[h.collectorId] = (inputs.pendingHandovers[h.collectorId] ?? 0) + amt;
  }
  for (const b of bankTxns) {
    if (b.type === "DEPOSIT_CASH") inputs.cashDeposits += b._sum.amount ?? 0;
    else inputs.withdrawals += b._sum.amount ?? 0;
  }
  for (const e of expenses) {
    if (e.paidFrom === "CASH") inputs.cashExpenses += e._sum.amount ?? 0;
    else inputs.bankExpenses += e._sum.amount ?? 0;
  }
  for (const r of income) {
    if (r.receivedIn === "CASH") inputs.incomeCash += r._sum.amount ?? 0;
    else inputs.incomeBank += r._sum.amount ?? 0;
  }
  return inputs;
}

export async function getBalances(client: Client, festivalId: string) {
  return computeBalances(await loadBalanceInputs(client, festivalId));
}

/**
 * Call inside a transaction after any money change. Refuses the change if it would leave
 * cash, bank, or a collector's cash below zero.
 */
export async function assertBalancesValid(client: Client, festivalId: string) {
  const b = await getBalances(client, festivalId);
  if (b.cashInHand < 0) throw new Error("Not enough cash in hand for that.");
  if (b.bank < 0) throw new Error("Not enough in the bank for that.");
  if (Object.values(b.available).some((v) => v < 0)) {
    throw new Error("That would leave a collector with less cash than they have handed over or requested. Reject or fix the handover first.");
  }
}
