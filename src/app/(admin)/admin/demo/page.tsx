import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";
import { demoStatus } from "@/modules/demo/service";
import { DEMO_PASSWORD } from "@/modules/demo/plan";
import { LoadDemoButton, RemoveDemoButton } from "./DemoForms";

const LOGINS = [
  ["Collector", "Ravi Kumar", "demo_ravi", "North Street and Lake Side"],
  ["Collector", "Meena Devi", "demo_meena", "Temple Road"],
  ["Collector", "Arun Prakash", "demo_arun", "Market Lane"],
  ["Treasurer", "Suresh Nair", "demo_treasurer", "All money"],
];

const STEPS: [string, string][] = [
  ["Admin: the big picture", "Overview, Fund and Reports. 2026 is about two-thirds collected, with charts by collector, payment type and year. Open Households and a household's Earlier years to show 2023 giving."],
  ["Collector: demo_ravi", "The dashboard shows what is collected, what is pending and who still owes. Record a cash payment, then Hand over cash to send a request."],
  ["Treasurer: demo_treasurer", "The home page shows handovers waiting. Confirm one, then watch cash in hand rise. Move a cheque from received to deposited to cleared, deposit cash to the bank, and add an expense."],
  ["Admin again: reports", "Collector statements show what each collector took, handed over and still holds. The Audit log lists every step you just made."],
  ["Year-end", "Festivals shows the close checklist with what blocks closing (cash with collectors, open cheques). Do not close the 2026 demo festival unless you want to start over: remove and load the demo again to reset."],
];

export default async function DemoPage() {
  await requireRole("ADMIN");
  const s = await demoStatus();
  const hasReal = s.realFestivals > 0 || s.realHouseholds > 0 || s.realCollections > 0;

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Demo data" subtitle="Sample festivals for presentations. Loaded and removed in one click." />

      {!s.loaded ? (
        <section className="space-y-4 rounded-[18px] border bg-card p-5">
          <h2 className="font-bold">Load a sample 2023 and 2026 festival</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-500">
            <li><b className="text-fg">2023:</b> a finished festival. Promises, payments (cash, online, cheque), handovers, a bank deposit, expenses, and a closing balance carried into 2026.</li>
            <li><b className="text-fg">2026:</b> collection in progress. Handovers waiting, cheques still to clear, cash held by collectors, people who still owe.</li>
            <li><b className="text-fg">People:</b> 68 households in 4 areas, three collectors and a treasurer, each with a login.</li>
          </ul>
          <p className="text-sm text-gray-500">Everything is marked as demo, so removing it later deletes only the demo and anything entered while demonstrating. Real records are never touched.</p>
          <LoadDemoButton blockedReason={hasReal ? "Real festivals, households or payments already exist, so the demo cannot be loaded. It only loads into an empty app, so it never mixes with real records." : undefined} />
        </section>
      ) : (
        <>
          <section className="space-y-3 rounded-[18px] border border-warn bg-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-warn-bg px-2.5 py-0.5 text-xs font-bold text-warn">Demo data is loaded</span>
              <span className="text-sm text-gray-500">{s.festivals} festivals · {s.households} households · {s.collections} payments · {s.users} demo accounts</span>
            </div>
            <p className="text-sm text-gray-500">Remove it before entering real records. The demo treasurer can see everything, so do not leave it in place once real data exists.</p>
            <RemoveDemoButton />
          </section>

          <section className="space-y-3 rounded-[18px] border bg-card p-5">
            <h2 className="font-bold">Demo logins</h2>
            <p className="text-sm text-gray-500">Password for all four: <code className="rounded bg-gray-100 px-1.5 py-0.5 font-semibold text-fg">{DEMO_PASSWORD}</code></p>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100"><tr><th className="p-2">Role</th><th className="p-2">Name</th><th className="p-2">Username</th><th className="p-2">Sees</th></tr></thead>
                <tbody>
                  {LOGINS.map(([role, name, user, sees]) => (
                    <tr key={user} className="border-t"><td className="p-2">{role}</td><td className="p-2">{name}</td><td className="p-2 font-mono">{user}</td><td className="p-2 text-gray-500">{sees}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500">Tip: use a private window for each person so you do not sign out of the admin.</p>
          </section>

          <section className="space-y-3 rounded-[18px] border bg-card p-5">
            <h2 className="font-bold">Suggested walkthrough</h2>
            <ol className="space-y-3">
              {STEPS.map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">{i + 1}</span>
                  <div><p className="font-semibold">{t}</p><p className="text-sm text-gray-500">{d}</p></div>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
