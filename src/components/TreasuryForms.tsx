"use client";

import { useActionState, useRef, useState } from "react";
import { btn as btnClass } from "./ui/btn";
import { ConfirmVoid } from "./ui/ConfirmVoid";
import { Icon } from "./ui/Icon";
import { compressImage } from "./compressImage";
import { validateBill } from "@/lib/bills";
import {
  addExpenseAction, bankMoveAction, createCategoryAction, moveChequeAction, recordHandoverReceivedAction,
  requestHandoverAction, resolveHandoverAction, voidExpenseAction,
} from "@/modules/treasury/actions";
import type { FormState } from "@/modules/users/actions";

const box = "w-full rounded border p-2";
const btn = btnClass("primary");

function Msg({ s, done }: { s: FormState; done: string }) {
  return (
    <>
      {s.error && <p className="w-full text-sm text-red-600">{s.error}</p>}
      {s.ok && <p className="w-full text-sm text-green-700">{done}</p>}
    </>
  );
}

export function RequestHandoverForm({ max }: { max: number }) {
  const [s, a, p] = useActionState(requestHandoverAction, {});
  return (
    <form action={a} className="flex flex-wrap items-end gap-2">
      <label className="text-sm">Amount (Rs)<input name="amount" type="number" step="0.01" min="0.01" max={max / 100} defaultValue={max > 0 ? max / 100 : ""} required className={`${box} mt-1 w-40`} /></label>
      <label className="min-w-40 flex-1 text-sm">Note<input name="note" className={`${box} mt-1`} /></label>
      <button disabled={p || max <= 0} className={btn}>Hand over to treasurer</button>
      <Msg s={s} done="Sent. The treasurer will confirm when they receive it." />
    </form>
  );
}

export function ReceivedForm({ collectors }: { collectors: { id: string; name: string }[] }) {
  const [s, a, p] = useActionState(recordHandoverReceivedAction, {});
  return (
    <form action={a} className="grid gap-2 sm:grid-cols-3">
      <select name="collectorId" required defaultValue="" className={box}>
        <option value="" disabled>Collector</option>
        {collectors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input name="amount" type="number" step="0.01" min="0.01" placeholder="Amount (Rs)" required className={box} />
      <input name="note" placeholder="Note" className={box} />
      <button disabled={p} className={`${btn} sm:col-span-3`}>Record cash received</button>
      <Msg s={s} done="Recorded." />
    </form>
  );
}

export function ResolveHandoverForm({ id }: { id: string }) {
  const [s, a, p] = useActionState(resolveHandoverAction, {});
  return (
    <form action={a} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="id" value={id} />
      <input name="note" placeholder="Note (optional)" aria-label="Note" className="h-8 w-40 rounded-xl border px-3 text-sm" />
      <button name="decision" value="CONFIRMED" disabled={p} className="btn btn-primary btn-sm"><Icon name="check" />Confirm received</button>
      <button name="decision" value="REJECTED" disabled={p} className="btn btn-secondary btn-sm"><Icon name="x" />Reject</button>
      {s.error && <span className="text-xs text-bad">{s.error}</span>}
    </form>
  );
}

export function ChequeButtons({ id, status }: { id: string; status: string }) {
  const [s, a, p] = useActionState(moveChequeAction, {});
  const [bouncing, setBouncing] = useState(false);
  const open = status === "RECEIVED" || status === "DEPOSITED";
  return (
    <form action={a} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="id" value={id} />
      {!bouncing && status === "RECEIVED" && <button name="step" value="deposit" disabled={p} className="btn btn-primary btn-sm"><Icon name="check" />Mark deposited</button>}
      {!bouncing && status === "DEPOSITED" && <button name="step" value="clear" disabled={p} className="btn btn-primary btn-sm"><Icon name="check" />Mark cleared</button>}
      {open && !bouncing && (
        <button type="button" onClick={() => setBouncing(true)} className="btn btn-danger btn-sm">Bounced</button>
      )}
      {open && bouncing && (
        <>
          <input name="reason" placeholder="Bounce reason" aria-label="Bounce reason" autoFocus className="h-8 w-40 rounded-xl border px-3 text-sm" />
          <button name="step" value="bounce" disabled={p} className="btn btn-danger-solid btn-sm"><Icon name="check" />Confirm bounced</button>
          <button type="button" onClick={() => setBouncing(false)} className="btn btn-ghost btn-sm">Cancel</button>
        </>
      )}
      {s.error && <span className="text-xs text-bad">{s.error}</span>}
    </form>
  );
}

export function BankForm() {
  const [s, a, p] = useActionState(bankMoveAction, {});
  return (
    <form action={a} className="grid gap-2 sm:grid-cols-2">
      <select name="type" className={box}>
        <option value="DEPOSIT_CASH">Deposit cash into bank</option>
        <option value="WITHDRAWAL">Withdraw cash from bank</option>
      </select>
      <input name="amount" type="number" step="0.01" min="0.01" placeholder="Amount (Rs)" required className={box} />
      <input name="date" type="date" className={box} />
      <input name="reference" placeholder="Slip / reference" className={box} />
      <button disabled={p} className={`${btn} sm:col-span-2`}>Record</button>
      <Msg s={s} done="Recorded." />
    </form>
  );
}

export function ExpenseForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [s, a, p] = useActionState(addExpenseAction, {});
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileMsg, setFileMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const picked = input.files?.[0];
    if (!picked) return setFileMsg(null);
    const file = await compressImage(picked);
    const problem = validateBill(file);
    if (problem) {
      input.value = "";
      return setFileMsg({ text: problem, bad: true });
    }
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    setFileMsg({ text: `${file.name} (${Math.max(1, Math.round(file.size / 1000))} KB) is ready to attach.` });
  }

  return (
    <form action={a} className="grid gap-2 sm:grid-cols-2">
      <select name="categoryId" required defaultValue="" className={box}>
        <option value="" disabled>Category</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input name="amount" type="number" step="0.01" min="0.01" placeholder="Amount (Rs)" required className={box} />
      <input name="description" placeholder="What was it for?" required className={`${box} sm:col-span-2`} />
      <select name="paidFrom" className={box}>
        <option value="CASH">Paid from cash in hand</option>
        <option value="BANK">Paid from bank</option>
      </select>
      <input name="paidOn" type="date" className={box} />
      <input name="vendor" placeholder="Vendor / paid to" className={box} />
      <input name="billReference" placeholder="Bill number" className={box} />
      <label className="text-sm sm:col-span-2">
        <span className="font-semibold">Photo or PDF of the bill</span> <span className="text-gray-500">(optional)</span>
        <input ref={fileRef} id="bill" name="bill" type="file" accept="image/*,application/pdf" onChange={onFile} className="mt-1 w-full rounded-xl border p-2 text-sm" />
        {fileMsg && <span className={`mt-1 block text-xs ${fileMsg.bad ? "text-bad" : "text-gray-500"}`}>{fileMsg.text}</span>}
      </label>
      <button disabled={p} className={`${btn} sm:col-span-2`}>Add expense</button>
      <Msg s={s} done="Expense added." />
    </form>
  );
}

export function CategoryForm() {
  const [s, a, p] = useActionState(createCategoryAction, {});
  return (
    <form action={a} className="flex flex-wrap items-center gap-2">
      <input name="name" placeholder="New category" required className="rounded-xl border p-2 bg-card" />
      <button disabled={p} className="btn btn-secondary btn-sm">Add category</button>
      <Msg s={s} done="Added." />
    </form>
  );
}

export function VoidExpenseForm({ id }: { id: string }) {
  const [s, a, p] = useActionState(voidExpenseAction, {});
  return (
    <form action={a}>
      <ConfirmVoid pending={p} error={s.error}>
        <input type="hidden" name="id" value={id} />
      </ConfirmVoid>
    </form>
  );
}
