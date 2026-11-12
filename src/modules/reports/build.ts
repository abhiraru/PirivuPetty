import { db } from "@/lib/db";
import { getBalances } from "@/modules/treasury/balances";
import { loadFestivalData, type HouseholdRow } from "./data";
import { withTotals, type Report, type Table } from "./types";

export const REPORTS = [
  { id: "collectors", title: "Collector statements", description: "For each collector: what they collected, handed over, still hold, and what is not yet paid in their area." },
  { id: "areas", title: "Collection by area", description: "Promised, collected and still to collect in every area." },
  { id: "pending", title: "Pending and unpaid households", description: "Every household that has not paid in full, with phone and collector." },
  { id: "cheques", title: "Cheques", description: "Every cheque and where it stands." },
  { id: "expenses", title: "Expenses", description: "Spending by category and the full list." },
  { id: "books", title: "Cash book and bank book", description: "Every cash and bank movement in date order with a running balance." },
  { id: "summary", title: "Year summary", description: "Income, spending, balances, and a comparison with earlier years." },
] as const;

type Agg = { households: number; pledged: number; pledgedHouseholds: number; collected: number; outstanding: number; unpaid: number; noPromise: number };

function aggregate(rows: HouseholdRow[]): Agg {
  return {
    households: rows.length,
    pledged: rows.reduce((s, r) => s + (r.pledge ?? 0), 0),
    pledgedHouseholds: rows.filter((r) => r.pledge !== null).length,
    collected: rows.reduce((s, r) => s + r.paid, 0),
    outstanding: rows.reduce((s, r) => s + r.balance, 0),
    unpaid: rows.filter((r) => r.balance > 0).length,
    noPromise: rows.filter((r) => r.pledge === null).length,
  };
}

const money = (key: string, label: string) => ({ key, label, kind: "money" as const });
const int = (key: string, label: string) => ({ key, label, kind: "int" as const });
const text = (key: string, label: string) => ({ key, label, kind: "text" as const });
/** A text column that also becomes a dropdown filter on the report screen. */
const ftext = (key: string, label: string) => ({ key, label, kind: "text" as const, filter: true });
const isoDay = (d: Date) => d.toLocaleDateString("en-CA");

async function collectorsReport(festivalId: string): Promise<Table[]> {
  const { rows, nameOf, collectorOfArea } = await loadFestivalData(festivalId);
  const [byCollectorMode, balances] = await Promise.all([
    db.collection.groupBy({ by: ["collectorId", "mode"], where: { festivalId, status: "VALID" }, _sum: { amount: true } }),
    getBalances(db, festivalId),
  ]);
  const took = (id: string | null, mode?: string) =>
    byCollectorMode.filter((b) => b.collectorId === id && (!mode || b.mode === mode)).reduce((s, b) => s + (b._sum.amount ?? 0), 0);

  const ids = new Set<string>([...collectorOfArea.values(), ...byCollectorMode.flatMap((b) => (b.collectorId ? [b.collectorId] : []))]);
  const summary: Table["rows"] = [];
  for (const id of [...ids].sort((a, b) => (nameOf.get(a) ?? "").localeCompare(nameOf.get(b) ?? ""))) {
    const mine = rows.filter((r) => r.collectorId === id);
    const a = aggregate(mine);
    const hold = balances.collectorHoldings.find((h) => h.collectorId === id);
    summary.push({
      collector: nameOf.get(id) ?? "Unknown",
      areas: [...new Set(mine.map((r) => r.areaName))].join(", ") || "none",
      households: a.households,
      pledgedHouseholds: a.pledgedHouseholds,
      pledged: a.pledged,
      takenCash: took(id, "CASH"),
      takenCheque: took(id, "CHEQUE"),
      takenOnline: took(id, "ONLINE"),
      takenTotal: took(id),
      handedOver: took(id, "CASH") - (hold?.holding ?? took(id, "CASH")), // cash taken minus cash still held
      holding: hold?.holding ?? 0,
      areaCollected: a.collected,
      outstanding: a.outstanding,
      unpaidHouseholds: a.unpaid,
      noPromise: a.noPromise,
    });
  }
  const direct = took(null);
  const t1 = withTotals({
    title: "Collector summary",
    note: "\"Taken\" is money the collector received. \"Not paid\" is promised money still unpaid by households in their area, whoever took the payments.",
    cols: [
      ftext("collector", "Collector"), text("areas", "Areas"), int("households", "Households"), int("pledgedHouseholds", "Promised"),
      money("pledged", "Promised amount"), money("takenCash", "Taken: cash"), money("takenCheque", "Taken: cheque"), money("takenOnline", "Taken: online"),
      money("takenTotal", "Taken: total"), money("handedOver", "Cash handed over"), money("holding", "Cash still held"),
      money("areaCollected", "Paid in their area"), money("outstanding", "Not paid"), int("unpaidHouseholds", "Households not paid"), int("noPromise", "No promise yet"),
    ],
    rows: summary,
  });
  const out: Table[] = [t1];
  if (direct > 0) out.push({ title: "Received directly by the treasurer", cols: [money("amount", "Amount")], rows: [{ amount: direct }] });

  const unpaidRows = rows
    .filter((r) => r.collectorId && (r.balance > 0 || r.pledge === null))
    .sort((a, b) => (nameOf.get(a.collectorId!) ?? "").localeCompare(nameOf.get(b.collectorId!) ?? "") || b.balance - a.balance)
    .map((r) => ({ collector: nameOf.get(r.collectorId!) ?? "", area: r.areaName, household: r.name, phone: r.phone, pledge: r.pledge, paid: r.paid, balance: r.balance, status: r.status }));
  out.push(
    withTotals({
      title: "Households not paid, by collector",
      cols: [ftext("collector", "Collector"), ftext("area", "Area"), text("household", "Household"), text("phone", "Phone"), money("pledge", "Promised"), money("paid", "Paid"), money("balance", "Not paid"), ftext("status", "Status")],
      rows: unpaidRows,
    }),
  );
  return out;
}

async function areasReport(festivalId: string): Promise<Table[]> {
  const { rows, nameOf, collectorOfArea } = await loadFestivalData(festivalId);
  const areaIds = [...new Set(rows.map((r) => r.areaId))];
  const out = areaIds.map((id) => {
    const mine = rows.filter((r) => r.areaId === id);
    const a = aggregate(mine);
    const c = collectorOfArea.get(id);
    return { area: mine[0].areaName, collector: c ? nameOf.get(c) ?? "" : "Unassigned", households: a.households, pledgedHouseholds: a.pledgedHouseholds, pledged: a.pledged, collected: a.collected, outstanding: a.outstanding, unpaid: a.unpaid };
  });
  return [
    withTotals({
      title: "Collection by area",
      cols: [ftext("area", "Area"), ftext("collector", "Collector"), int("households", "Households"), int("pledgedHouseholds", "Promised"), money("pledged", "Promised amount"), money("collected", "Collected"), money("outstanding", "Not paid"), int("unpaid", "Households not paid")],
      rows: out.sort((a, b) => a.area.localeCompare(b.area)),
    }),
  ];
}

async function pendingReport(festivalId: string): Promise<Table[]> {
  const { rows, nameOf } = await loadFestivalData(festivalId);
  const pending = rows
    .filter((r) => r.balance > 0 || r.pledge === null)
    .sort((a, b) => a.areaName.localeCompare(b.areaName) || b.balance - a.balance)
    .map((r) => ({ area: r.areaName, household: r.name, address: r.address, phone: r.phone, collector: r.collectorId ? nameOf.get(r.collectorId) ?? "" : "Unassigned", pledge: r.pledge, paid: r.paid, balance: r.balance, status: r.status }));
  return [
    withTotals({
      title: "Households that have not paid in full",
      cols: [ftext("area", "Area"), text("household", "Household"), text("address", "Address"), text("phone", "Phone"), ftext("collector", "Collector"), money("pledge", "Promised"), money("paid", "Paid"), money("balance", "Not paid"), ftext("status", "Status")],
      rows: pending,
    }),
  ];
}

async function chequesReport(festivalId: string): Promise<Table[]> {
  const list = await db.collection.findMany({
    where: { festivalId, mode: "CHEQUE" },
    orderBy: { collectedOn: "asc" },
    include: { household: { select: { headName: true } }, collector: { select: { name: true } } },
  });
  return [
    withTotals({
      title: "Cheques",
      dateKey: "iso",
      cols: [text("date", "Received"), text("household", "Household"), text("chequeNo", "Cheque no."), text("bank", "Bank"), ftext("collector", "Taken by"), ftext("status", "Status"), money("amount", "Amount")],
      rows: list.map((c) => ({ iso: isoDay(c.collectedOn), date: c.collectedOn.toLocaleDateString("en-IN"), household: c.household.headName, chequeNo: c.chequeNo ?? "", bank: c.chequeBank ?? "", collector: c.collector?.name ?? "Treasurer", status: (c.chequeStatus ?? "").toLowerCase(), amount: c.amount })),
    }),
  ];
}

async function expensesReport(festivalId: string): Promise<Table[]> {
  const list = await db.expense.findMany({ where: { festivalId, status: "VALID" }, orderBy: { paidOn: "asc" }, include: { category: true } });
  const byCat = new Map<string, number>();
  for (const e of list) byCat.set(e.category.name, (byCat.get(e.category.name) ?? 0) + e.amount);
  return [
    withTotals({ title: "Spending by category", cols: [ftext("category", "Category"), money("amount", "Spent")], rows: [...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount })) }),
    withTotals({
      title: "All expenses",
      dateKey: "iso",
      cols: [text("date", "Date"), ftext("category", "Category"), text("description", "Description"), text("vendor", "Paid to"), text("bill", "Bill no."), ftext("from", "Paid from"), money("amount", "Amount")],
      rows: list.map((e) => ({ iso: isoDay(e.paidOn), date: e.paidOn.toLocaleDateString("en-IN"), category: e.category.name, description: e.description, vendor: e.vendor ?? "", bill: e.billReference ?? "", from: e.paidFrom.toLowerCase(), amount: e.amount })),
    }),
  ];
}

type Entry = { at: Date; label: string; delta: number };

function book(title: string, opening: number, entries: Entry[], note?: string): Table {
  let running = opening;
  const rows: Table["rows"] = [{ date: "", detail: "Opening balance", in: null, out: null, balance: opening }];
  for (const e of entries.sort((a, b) => a.at.getTime() - b.at.getTime())) {
    running += e.delta;
    rows.push({ date: e.at.toLocaleDateString("en-IN"), detail: e.label, in: e.delta > 0 ? e.delta : null, out: e.delta < 0 ? -e.delta : null, balance: running });
  }
  return { title, note, cols: [text("date", "Date"), text("detail", "Details"), money("in", "In"), money("out", "Out"), money("balance", "Balance")], rows };
}

async function booksReport(festivalId: string): Promise<Table[]> {
  const f = await db.festival.findUniqueOrThrow({ where: { id: festivalId } });
  const [cols, handovers, bankTxns, expenses] = await Promise.all([
    db.collection.findMany({ where: { festivalId, status: "VALID" }, include: { household: { select: { headName: true } } } }),
    db.handover.findMany({ where: { festivalId, status: "CONFIRMED" }, include: { collector: { select: { name: true } } } }),
    db.bankTransaction.findMany({ where: { festivalId } }),
    db.expense.findMany({ where: { festivalId, status: "VALID" } }),
  ]);
  const cash: Entry[] = [];
  const bank: Entry[] = [];
  for (const c of cols) {
    if (c.mode === "CASH" && !c.collectorId) cash.push({ at: c.collectedOn, label: `Cash from ${c.household.headName}`, delta: c.amount });
    if (c.mode === "ONLINE") bank.push({ at: c.collectedOn, label: `Online from ${c.household.headName} (${c.txnId})`, delta: c.amount });
    if (c.mode === "CHEQUE" && c.chequeStatus === "CLEARED") bank.push({ at: c.collectedOn, label: `Cheque ${c.chequeNo} from ${c.household.headName} (cleared)`, delta: c.amount });
  }
  for (const h of handovers) cash.push({ at: h.handedOn, label: `Cash handed over by ${h.collector.name}`, delta: h.amount });
  for (const t of bankTxns) {
    const d = t.type === "DEPOSIT_CASH" ? 1 : -1;
    cash.push({ at: t.date, label: t.type === "DEPOSIT_CASH" ? "Deposited into bank" : "Withdrawn from bank", delta: -d * t.amount });
    bank.push({ at: t.date, label: t.type === "DEPOSIT_CASH" ? "Cash deposited" : "Cash withdrawn", delta: d * t.amount });
  }
  for (const e of expenses) (e.paidFrom === "CASH" ? cash : bank).push({ at: e.paidOn, label: `Expense: ${e.description}`, delta: -e.amount });
  return [
    book("Cash book (treasurer's cash)", f.openingCash, cash),
    book("Bank book", f.openingBank, bank, "Cleared cheques are dated by the day they were received."),
  ];
}

async function summaryReport(festivalId: string): Promise<Table[]> {
  const f = await db.festival.findUniqueOrThrow({ where: { id: festivalId } });
  const [b, pledgeSum, byMode, allFestivals] = await Promise.all([
    getBalances(db, festivalId),
    db.pledge.aggregate({ where: { festivalId }, _sum: { amount: true } }),
    db.collection.groupBy({ by: ["mode"], where: { festivalId, status: "VALID" }, _sum: { amount: true } }),
    db.festival.findMany({ where: { status: { not: "DRAFT" } }, orderBy: { year: "asc" } }),
  ]);
  const mode = (m: string) => byMode.find((x) => x.mode === m)?._sum.amount ?? 0;
  const collected = mode("CASH") + mode("CHEQUE") + mode("ONLINE");
  const closingCash = f.closingCash ?? b.cashInHand;
  const closingBank = f.closingBank ?? b.bank;
  const lines: [string, number][] = [
    ["Opening cash in hand", f.openingCash], ["Opening bank balance", f.openingBank], ["Promised", pledgeSum._sum.amount ?? 0],
    ["Collected: cash", mode("CASH")], ["Collected: cheque", mode("CHEQUE")], ["Collected: online", mode("ONLINE")], ["Collected: total", collected],
    ["Spent", b.spentTotal], ["Collected minus spent", collected - b.spentTotal],
    [f.status === "CLOSED" ? "Closing cash in hand" : "Cash in hand now", closingCash], [f.status === "CLOSED" ? "Closing bank balance" : "Bank balance now", closingBank],
    ["Carried to next year", closingCash + closingBank],
  ];

  const cmp = await Promise.all(
    allFestivals.map(async (x) => {
      const [p, c, e] = await Promise.all([
        db.pledge.aggregate({ where: { festivalId: x.id }, _sum: { amount: true } }),
        db.collection.aggregate({ where: { festivalId: x.id, status: "VALID" }, _sum: { amount: true } }),
        db.expense.aggregate({ where: { festivalId: x.id, status: "VALID" }, _sum: { amount: true } }),
      ]);
      return { year: x.year, festival: x.name, pledged: p._sum.amount ?? 0, collected: c._sum.amount ?? 0, spent: e._sum.amount ?? 0, left: (c._sum.amount ?? 0) - (e._sum.amount ?? 0) };
    }),
  );
  return [
    { title: `Summary: ${f.name}`, cols: [text("line", "Item"), money("amount", "Amount")], rows: lines.map(([line, amount]) => ({ line, amount })) },
    {
      title: "Comparison with other years",
      note: "Imported history years only have collected amounts.",
      cols: [int("year", "Year"), text("festival", "Festival"), money("pledged", "Promised"), money("collected", "Collected"), money("spent", "Spent"), money("left", "Collected minus spent")],
      rows: cmp,
    },
  ];
}

const BUILDERS: Record<string, (festivalId: string) => Promise<Table[]>> = {
  collectors: collectorsReport, areas: areasReport, pending: pendingReport, cheques: chequesReport,
  expenses: expensesReport, books: booksReport, summary: summaryReport,
};

export async function buildReport(id: string, festivalId: string): Promise<Report | null> {
  const meta = REPORTS.find((r) => r.id === id);
  const build = BUILDERS[id];
  if (!meta || !build) return null;
  const festival = await db.festival.findUnique({ where: { id: festivalId } });
  if (!festival) return null;
  return { id, title: meta.title, festivalName: festival.name, tables: await build(festivalId) };
}
