import { describe, expect, it } from "vitest";
import { computeBalances, type BalanceInputs } from "./balances";

const zero: BalanceInputs = {
  openingCash: 0, openingBank: 0, directCash: 0, collectorCash: {}, confirmedHandovers: {}, pendingHandovers: {},
  online: 0, chequeReceived: 0, chequeDeposited: 0, chequeCleared: 0, cashDeposits: 0, withdrawals: 0, cashExpenses: 0, bankExpenses: 0, incomeCash: 0, incomeBank: 0,
};

describe("computeBalances", () => {
  it("carries the opening balance", () => {
    const b = computeBalances({ ...zero, openingCash: 1000, openingBank: 5000 });
    expect(b.cashInHand).toBe(1000);
    expect(b.bank).toBe(5000);
    expect(b.netFund).toBe(6000);
  });

  it("cash stays with the collector until handed over and confirmed", () => {
    const b = computeBalances({ ...zero, collectorCash: { c1: 10000 } });
    expect(b.cashInHand).toBe(0);
    expect(b.totalWithCollectors).toBe(10000);
    const after = computeBalances({ ...zero, collectorCash: { c1: 10000 }, confirmedHandovers: { c1: 4000 } });
    expect(after.cashInHand).toBe(4000);
    expect(after.totalWithCollectors).toBe(6000);
  });

  it("a pending handover reduces what can still be requested but not the holding", () => {
    const b = computeBalances({ ...zero, collectorCash: { c1: 10000 }, pendingHandovers: { c1: 3000 } });
    expect(b.collectorHoldings[0]).toEqual({ collectorId: "c1", holding: 10000, pending: 3000 });
    expect(b.available.c1).toBe(7000);
    expect(b.cashInHand).toBe(0);
  });

  it("online goes to bank; cheques reach the bank only when cleared", () => {
    const b = computeBalances({ ...zero, online: 2000, chequeReceived: 500, chequeDeposited: 300, chequeCleared: 700 });
    expect(b.bank).toBe(2700);
    expect(b.chequesNotCleared).toBe(800);
    expect(b.collectedTotal).toBe(2000 + 500 + 300 + 700);
  });

  it("moves cash to bank and back, and pays expenses from the right pot", () => {
    const b = computeBalances({
      ...zero, directCash: 10000, cashDeposits: 6000, withdrawals: 1000, cashExpenses: 2000, bankExpenses: 1500,
    });
    expect(b.cashInHand).toBe(10000 - 6000 + 1000 - 2000);
    expect(b.bank).toBe(6000 - 1000 - 1500);
    expect(b.spentTotal).toBe(3500);
  });

  it("total money is conserved by deposit and withdrawal", () => {
    const before = computeBalances({ ...zero, directCash: 9000 });
    const after = computeBalances({ ...zero, directCash: 9000, cashDeposits: 4000 });
    expect(after.netFund).toBe(before.netFund);
  });

  it("other income lands in the pot it was received into", () => {
    const b = computeBalances({ ...zero, openingCash: 1000, openingBank: 5000, incomeBank: 312, incomeCash: 2000 });
    expect(b.bank).toBe(5312);
    expect(b.cashInHand).toBe(3000);
    expect(b.otherIncome).toBe(2312);
    expect(b.netFund).toBe(8312);
  });

  it("other income is not counted as collected from households", () => {
    const b = computeBalances({ ...zero, directCash: 400, incomeBank: 900 });
    expect(b.collectedTotal).toBe(400);
    expect(b.otherIncome).toBe(900);
  });

  it("spending can use other income", () => {
    const b = computeBalances({ ...zero, incomeBank: 1000, bankExpenses: 700 });
    expect(b.bank).toBe(300);
  });
});
