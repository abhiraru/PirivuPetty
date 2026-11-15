/**
 * Demo data for presentations: a closed 2023 festival and an active 2026 festival with three collectors and a treasurer.
 * Pure and deterministic. It works out every balance as it goes, and the loader checks the saved result against `expected`.
 *
 * Every id starts with DEMO_PREFIX, which is how the demo is found and removed later without touching real records.
 */

export const DEMO_PREFIX = "demo_";
export const DEMO_PASSWORD = "Demo@2026-Pirivu";

type Mode = "CASH" | "CHEQUE" | "ONLINE";
type ChequeStatus = "RECEIVED" | "DEPOSITED" | "CLEARED";

export type DemoPlan = {
  users: { id: string; name: string; username: string; phone: string; role: "COLLECTOR" | "TREASURER" }[];
  areas: { id: string; name: string }[];
  assignments: { festivalId: string; areaId: string; collectorId: string }[];
  households: { id: string; headName: string; phone: string; address: string; areaId: string }[];
  festivals: {
    id: string; name: string; year: number; status: "CLOSED" | "ACTIVE"; startDate: Date; endDate: Date | null;
    openingCash: number; openingBank: number; closingCash: number | null; closingBank: number | null;
    countedCash?: number; countedBank?: number; reconNote?: string; reconAt?: Date; reconById?: string;
  }[];
  pledges: { id: string; festivalId: string; householdId: string; amount: number; createdById: string }[];
  collections: {
    id: string; festivalId: string; householdId: string; collectorId: string | null; recordedById: string; amount: number; mode: Mode;
    collectedOn: Date; txnId: string | null; chequeNo: string | null; chequeBank: string | null; chequeDate: Date | null; chequeStatus: ChequeStatus | null;
  }[];
  handovers: { id: string; festivalId: string; collectorId: string; amount: number; handedOn: Date; status: "CONFIRMED" | "PENDING"; confirmedBy: string | null; note: string | null }[];
  otherIncome: { id: string; festivalId: string; source: "BANK_INTEREST" | "SPONSORSHIP" | "DONATION"; description: string; amount: number; receivedIn: "CASH" | "BANK"; receivedOn: Date; reference: string; createdById: string }[];
  bankTxns: { id: string; festivalId: string; type: "DEPOSIT_CASH"; amount: number; date: Date; reference: string; createdById: string }[];
  expenses: {
    id: string; festivalId: string; categoryName: string; description: string; amount: number; paidFrom: "CASH" | "BANK";
    paidOn: Date; vendor: string; billReference: string; createdById: string;
  }[];
  /** What the app's own balance rules should report once this is saved. Money in paise. */
  expected: Record<string, { cash: number; bank: number; collected: number; otherIncome: number; spent: number; holdings: number; pending: number }>;
};

const rs = (rupees: number) => rupees * 100;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Anand", "Suresh", "Karthik", "Mohan", "Vijay", "Arun", "Ganesh", "Balaji", "Dinesh", "Ramesh", "Senthil", "Murugan", "Prakash", "Kumar", "Raman", "Lakshmi", "Meena", "Priya", "Kavitha", "Sumathi", "Geetha", "Radha", "Nirmala", "Divya"];
const LAST = ["Iyer", "Nair", "Pillai", "Menon", "Krishnan", "Subramanian", "Rajan", "Natarajan", "Venkatesh", "Sharma", "Reddy", "Bhat", "Kurup", "Warrier", "Mohan"];
const STREETS = ["1st Cross", "2nd Cross", "Main Road", "Temple Lane", "Park Avenue", "Gandhi Street", "Nehru Street", "Bazaar Lane"];
const AMOUNTS = [100, 200, 200, 300, 500, 500, 1000, 1000, 2000];
const STEPS = [100, 200, 300, 500, 1000, 2000];

const USERS = [
  { id: "demo_u_ravi", name: "Ravi Kumar", username: "demo_ravi", phone: "9000200001", role: "COLLECTOR" as const },
  { id: "demo_u_meena", name: "Meena Devi", username: "demo_meena", phone: "9000200002", role: "COLLECTOR" as const },
  { id: "demo_u_arun", name: "Arun Prakash", username: "demo_arun", phone: "9000200003", role: "COLLECTOR" as const },
  { id: "demo_u_treasurer", name: "Suresh Nair", username: "demo_treasurer", phone: "9000200004", role: "TREASURER" as const },
];
const TREASURER = "demo_u_treasurer";
const AREAS = [
  { id: "demo_a_north", name: "North Street", collector: "demo_u_ravi" },
  { id: "demo_a_lake", name: "Lake Side", collector: "demo_u_ravi" },
  { id: "demo_a_temple", name: "Temple Road", collector: "demo_u_meena" },
  { id: "demo_a_market", name: "Market Lane", collector: "demo_u_arun" },
];

const pad = (n: number, w = 3) => String(n).padStart(w, "0");

export function buildDemoPlan(now: Date = new Date()): DemoPlan {
  const r = rng(2026);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const daysAgo = (n: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);

  const households = Array.from({ length: 68 }, (_, i) => {
    const area = AREAS[i % 4];
    return {
      id: `demo_h_${pad(i + 1)}`,
      headName: `${FIRST[i % 24]} ${LAST[(i * 7 + Math.floor(i / 24) * 3) % 15]}`,
      phone: `9000100${pad(i + 1)}`,
      address: `${1 + ((i * 13) % 90)}, ${STREETS[i % 8]}, ${area.name}`,
      areaId: area.id,
    };
  });
  const collectorOf = new Map(AREAS.map((a) => [a.id, a.collector]));
  const hhCollector = (hid: string) => collectorOf.get(households.find((h) => h.id === hid)!.areaId)!;

  const F23 = "demo_f_2023";
  const F26 = "demo_f_2026";
  const plan: DemoPlan = {
    users: USERS.map((u) => ({ ...u })),
    areas: AREAS.map((a) => ({ id: a.id, name: a.name })),
    assignments: [F23, F26].flatMap((festivalId) => AREAS.map((a) => ({ festivalId, areaId: a.id, collectorId: a.collector }))),
    households,
    festivals: [],
    pledges: [],
    collections: [],
    handovers: [],
    bankTxns: [],
    otherIncome: [],
    expenses: [],
    expected: {},
  };

  const pickMode = (): Mode => {
    const x = r();
    return x < 0.6 ? "CASH" : x < 0.85 ? "ONLINE" : "CHEQUE";
  };
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  // ---------------- 2023: a finished festival ----------------
  const pledge23 = new Map<string, number>();
  let n23 = 0;
  for (let i = 0; i < 60; i++) {
    const h = households[i];
    const pledge = r() < 0.88 ? pick(AMOUNTS) : null;
    let paid = 0;
    if (pledge !== null) {
      pledge23.set(h.id, pledge);
      plan.pledges.push({ id: `demo_p_23_${pad(i + 1)}`, festivalId: F23, householdId: h.id, amount: rs(pledge), createdById: hhCollector(h.id) });
      const x = r();
      paid = x < 0.65 ? pledge : x < 0.85 ? Math.max(50, Math.round(pledge / 2 / 50) * 50) : 0;
    } else if (r() < 0.1) paid = pick([100, 200]);
    if (paid === 0) continue;
    const mode = pickMode();
    const date = new Date(2023, 9, 1 + Math.floor(r() * 20));
    n23++;
    plan.collections.push({
      id: `demo_c_23_${pad(n23)}`, festivalId: F23, householdId: h.id, collectorId: hhCollector(h.id), recordedById: hhCollector(h.id),
      amount: rs(paid), mode, collectedOn: date,
      txnId: mode === "ONLINE" ? `D23-${pad(n23)}` : null,
      chequeNo: mode === "CHEQUE" ? `0${pad(n23 + 4100, 5)}` : null, chequeBank: mode === "CHEQUE" ? "State Bank" : null,
      chequeDate: mode === "CHEQUE" ? date : null, chequeStatus: mode === "CHEQUE" ? "CLEARED" : null,
    });
  }
  const cash23ByCollector = new Map<string, number>();
  for (const c of plan.collections.filter((c) => c.festivalId === F23 && c.mode === "CASH" && c.collectorId))
    cash23ByCollector.set(c.collectorId!, (cash23ByCollector.get(c.collectorId!) ?? 0) + c.amount);
  for (const [collectorId, amount] of cash23ByCollector) {
    plan.handovers.push({ id: `demo_ho_23_${collectorId.slice(7)}`, festivalId: F23, collectorId, amount, handedOn: new Date(2023, 9, 26), status: "CONFIRMED", confirmedBy: TREASURER, note: "Festival 2023 collection" });
  }
  const EXP23: [string, string, number, "CASH" | "BANK", string, string, Date][] = [
    ["Decoration", "Pandal decoration and lights", 3500, "BANK", "Sri Lakshmi Decorators", "SLD-2231", new Date(2023, 9, 24)],
    ["Food", "Annadhanam lunch for 500 people", 3200, "CASH", "Hotel Annapoorna", "HA-0918", new Date(2023, 9, 29)],
    ["Sound and lights", "Sound system hire", 2800, "BANK", "Vel Sounds", "VS-117", new Date(2023, 9, 24)],
    ["Rituals", "Pooja items and priest", 1500, "CASH", "Sri Ganesh Stores", "SGS-552", new Date(2023, 9, 28)],
    ["Stage and tent", "Stage and tent rental", 2000, "BANK", "Murugan Tents", "MT-640", new Date(2023, 9, 23)],
    ["Printing", "Notices and receipt books", 800, "CASH", "Kavitha Printers", "KP-88", new Date(2023, 9, 2)],
    ["Transport", "Idol transport", 1200, "CASH", "Senthil Transport", "ST-301", new Date(2023, 9, 30)],
  ];
  EXP23.forEach(([categoryName, description, amount, paidFrom, vendor, billReference, paidOn], k) =>
    plan.expenses.push({ id: `demo_e_23_${k + 1}`, festivalId: F23, categoryName, description, amount: rs(amount), paidFrom, paidOn, vendor, billReference, createdById: TREASURER }),
  );
  plan.otherIncome.push(
    { id: "demo_i_23_1", festivalId: F23, source: "BANK_INTEREST", description: "Savings account interest, April to September", amount: rs(412), receivedIn: "BANK", receivedOn: new Date(2023, 9, 31), reference: "Bank entry 31 Oct", createdById: TREASURER },
    { id: "demo_i_23_2", festivalId: F23, source: "SPONSORSHIP", description: "Sri Lakshmi Jewellers sponsorship", amount: rs(3000), receivedIn: "CASH", receivedOn: new Date(2023, 9, 22), reference: "Receipt 118", createdById: TREASURER },
  );
  const open23 = { cash: rs(5000), bank: rs(20000) };
  const inc23 = { cash: sum(plan.otherIncome.filter((x) => x.festivalId === F23 && x.receivedIn === "CASH").map((x) => x.amount)), bank: sum(plan.otherIncome.filter((x) => x.festivalId === F23 && x.receivedIn === "BANK").map((x) => x.amount)) };
  const hand23 = sum(plan.handovers.filter((h) => h.festivalId === F23).map((h) => h.amount));
  const cashExp23 = sum(plan.expenses.filter((e) => e.festivalId === F23 && e.paidFrom === "CASH").map((e) => e.amount));
  const bankExp23 = sum(plan.expenses.filter((e) => e.festivalId === F23 && e.paidFrom === "BANK").map((e) => e.amount));
  const dep23 = Math.max(0, Math.floor((open23.cash + hand23 + inc23.cash - cashExp23 - rs(2000)) / 10000) * 10000);
  plan.bankTxns.push({ id: "demo_b_23_1", festivalId: F23, type: "DEPOSIT_CASH", amount: dep23, date: new Date(2023, 9, 28), reference: "Deposit slip 4471", createdById: TREASURER });
  const col23 = plan.collections.filter((c) => c.festivalId === F23);
  const exp23 = {
    cash: open23.cash + hand23 + inc23.cash - dep23 - cashExp23,
    bank: open23.bank + sum(col23.filter((c) => c.mode !== "CASH").map((c) => c.amount)) + inc23.bank + dep23 - bankExp23,
    collected: sum(col23.map((c) => c.amount)),
    otherIncome: inc23.cash + inc23.bank,
    spent: cashExp23 + bankExp23,
    holdings: 0,
    pending: 0,
  };
  plan.expected[F23] = exp23;
  plan.festivals.push({
    id: F23, name: "Festival 2023", year: 2023, status: "CLOSED", startDate: new Date(2023, 9, 1), endDate: new Date(2023, 10, 5),
    openingCash: open23.cash, openingBank: open23.bank, closingCash: exp23.cash, closingBank: exp23.bank,
    countedCash: exp23.cash, countedBank: exp23.bank, reconNote: "Counted by the treasurer and matched to the bank statement.", reconAt: new Date(2023, 10, 4), reconById: TREASURER,
  });

  // ---------------- 2026: collection in progress ----------------
  const bump = (base: number) => STEPS[Math.min(STEPS.indexOf(base) + 1, STEPS.length - 1)] ?? base;
  let n26 = 0;
  let cashIndex = 0;
  let chequeIndex = 0;
  const addPayment = (h: (typeof households)[number], amount: number, mode: Mode, day: number) => {
    n26++;
    let direct = false;
    if (mode === "CASH") {
      direct = cashIndex % 6 === 5;
      cashIndex++;
    }
    const date = daysAgo(day);
    let chequeStatus: ChequeStatus | null = null;
    if (mode === "CHEQUE") {
      chequeStatus = chequeIndex < 3 ? "RECEIVED" : chequeIndex < 5 ? "DEPOSITED" : "CLEARED";
      chequeIndex++;
    }
    const collector = hhCollector(h.id);
    plan.collections.push({
      id: `demo_c_26_${pad(n26)}`, festivalId: F26, householdId: h.id, collectorId: direct ? null : collector, recordedById: direct ? TREASURER : collector,
      amount: rs(amount), mode, collectedOn: date,
      txnId: mode === "ONLINE" ? `D26-${pad(n26)}` : null,
      chequeNo: mode === "CHEQUE" ? `0${pad(n26 + 5200, 5)}` : null, chequeBank: mode === "CHEQUE" ? "Canara Bank" : null,
      chequeDate: mode === "CHEQUE" ? date : null, chequeStatus,
    });
  };

  households.forEach((h, i) => {
    const base = pledge23.get(h.id) ?? null;
    let pledge: number | null;
    if (base !== null) {
      const x = r();
      pledge = x < 0.7 ? base : x < 0.95 ? bump(base) : null;
    } else pledge = r() < 0.8 ? pick(AMOUNTS) : null;

    if (pledge === null) {
      if (r() < 0.08) addPayment(h, pick([100, 200]), "CASH", Math.floor(r() * 13));
      return;
    }
    plan.pledges.push({ id: `demo_p_26_${pad(i + 1)}`, festivalId: F26, householdId: h.id, amount: rs(pledge), createdById: hhCollector(h.id) });
    const x = r();
    const day = Math.floor(r() * 13);
    if (x < 0.45) {
      if (r() < 0.15 && pledge >= 200) {
        const first = Math.max(50, Math.round((pledge * 0.6) / 50) * 50);
        const m: Mode = r() < 0.5 ? "CASH" : "ONLINE";
        addPayment(h, first, m, Math.min(12, day + 4));
        addPayment(h, pledge - first, m, day);
      } else addPayment(h, pledge, pickMode(), day);
    } else if (x < 0.7) {
      const part = Math.min(pledge - 50, Math.max(50, Math.round((pledge * (0.4 + r() * 0.2)) / 50) * 50));
      addPayment(h, part, pickMode(), day);
    }
  });

  const col26 = plan.collections.filter((c) => c.festivalId === F26);
  const cash26ByCollector = new Map<string, number>();
  for (const c of col26.filter((c) => c.mode === "CASH" && c.collectorId)) cash26ByCollector.set(c.collectorId!, (cash26ByCollector.get(c.collectorId!) ?? 0) + c.amount);
  let confirmed26 = 0;
  let holdings26 = 0;
  let pendingTotal = 0;
  for (const [collectorId, cash] of cash26ByCollector) {
    const confirmed = Math.floor((cash * 0.6) / 100) * 100;
    if (confirmed > 0) {
      confirmed26 += confirmed;
      plan.handovers.push({ id: `demo_ho_26_${collectorId.slice(7)}`, festivalId: F26, collectorId, amount: confirmed, handedOn: daysAgo(3), status: "CONFIRMED", confirmedBy: TREASURER, note: "Part of this week's collection" });
    }
    const remaining = cash - confirmed;
    holdings26 += remaining;
    if (collectorId === "demo_u_ravi" || collectorId === "demo_u_arun") {
      const pend = Math.floor((remaining * 0.5) / 100) * 100;
      if (pend > 0) {
        pendingTotal += pend;
        plan.handovers.push({ id: `demo_ho_26_${collectorId.slice(7)}_pending`, festivalId: F26, collectorId, amount: pend, handedOn: daysAgo(1), status: "PENDING", confirmedBy: null, note: "Handed over this morning" });
      }
    }
  }
  const EXP26: [string, string, number, "CASH" | "BANK", string, string, number][] = [
    ["Decoration", "Pandal advance", 5000, "BANK", "Sri Lakshmi Decorators", "SLD-3120", 9],
    ["Printing", "Pledge cards and receipt books", 1000, "CASH", "Kavitha Printers", "KP-131", 8],
    ["Sound and lights", "Sound system advance", 4000, "BANK", "Vel Sounds", "VS-204", 6],
    ["Food", "Volunteer tea and snacks", 800, "CASH", "Hotel Annapoorna", "HA-1207", 4],
  ];
  EXP26.forEach(([categoryName, description, amount, paidFrom, vendor, billReference, ago], k) =>
    plan.expenses.push({ id: `demo_e_26_${k + 1}`, festivalId: F26, categoryName, description, amount: rs(amount), paidFrom, paidOn: daysAgo(ago), vendor, billReference, createdById: TREASURER }),
  );
  plan.otherIncome.push(
    { id: "demo_i_26_1", festivalId: F26, source: "BANK_INTEREST", description: "Savings account interest, April to September", amount: rs(585), receivedIn: "BANK", receivedOn: daysAgo(6), reference: "Bank entry", createdById: TREASURER },
    { id: "demo_i_26_2", festivalId: F26, source: "SPONSORSHIP", description: "Local jeweller sponsorship for the pandal", amount: rs(5000), receivedIn: "BANK", receivedOn: daysAgo(5), reference: "Transfer ref 774201", createdById: TREASURER },
    { id: "demo_i_26_3", festivalId: F26, source: "DONATION", description: "Donation from a well-wisher outside the area", amount: rs(1000), receivedIn: "CASH", receivedOn: daysAgo(11), reference: "Receipt 204", createdById: TREASURER },
  );
  const inc26 = { cash: sum(plan.otherIncome.filter((x) => x.festivalId === F26 && x.receivedIn === "CASH").map((x) => x.amount)), bank: sum(plan.otherIncome.filter((x) => x.festivalId === F26 && x.receivedIn === "BANK").map((x) => x.amount)) };
  const direct26 = sum(col26.filter((c) => c.mode === "CASH" && !c.collectorId).map((c) => c.amount));
  const cashExp26 = sum(plan.expenses.filter((e) => e.festivalId === F26 && e.paidFrom === "CASH").map((e) => e.amount));
  const bankExp26 = sum(plan.expenses.filter((e) => e.festivalId === F26 && e.paidFrom === "BANK").map((e) => e.amount));
  const dep26 = Math.max(0, Math.floor(((exp23.cash + direct26 + inc26.cash + confirmed26 - cashExp26) * 0.5) / 10000) * 10000);
  plan.bankTxns.push({ id: "demo_b_26_1", festivalId: F26, type: "DEPOSIT_CASH", amount: dep26, date: daysAgo(2), reference: "Deposit slip 5120", createdById: TREASURER });
  const exp26 = {
    cash: exp23.cash + direct26 + inc26.cash + confirmed26 - dep26 - cashExp26,
    bank: exp23.bank + sum(col26.filter((c) => c.mode === "ONLINE" || (c.mode === "CHEQUE" && c.chequeStatus === "CLEARED")).map((c) => c.amount)) + inc26.bank + dep26 - bankExp26,
    collected: sum(col26.map((c) => c.amount)),
    otherIncome: inc26.cash + inc26.bank,
    spent: cashExp26 + bankExp26,
    holdings: holdings26,
    pending: pendingTotal,
  };
  plan.expected[F26] = exp26;
  plan.festivals.push({
    id: F26, name: "Festival 2026", year: 2026, status: "ACTIVE", startDate: daysAgo(20), endDate: null,
    openingCash: exp23.cash, openingBank: exp23.bank, closingCash: null, closingBank: null,
  });
  return plan;
}
