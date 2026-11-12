import Link from "next/link";
import { db } from "@/lib/db";
import { undoImportAction } from "@/modules/imports/actions";
import { ImportWizard } from "./ImportWizard";
import { PageHeader } from "@/components/PageHeader";

export default async function ImportPage() {
  const batches = await db.importBatch.findMany({ orderBy: { createdAt: "desc" }, take: 10 });
  return (
    <div className="space-y-6">
      <Link href="/admin/households" className="btn btn-secondary btn-sm">Back to households</Link>
      <PageHeader title="Import households and past amounts" />
      <div className="text-sm text-gray-700">
        <p>Columns: <code>name, phone, address, area, amount, year</code>. Phone is optional. Use one row per household per year.</p>
        <p>If your file is for a single year, leave the year column out and type the year below instead.</p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page */}
        <a href="/admin/households/import/template" className="btn btn-secondary btn-sm">Download the template</a>
      </div>
      <ImportWizard />
      <section>
        <h3 className="mb-1 font-medium">Previous imports</h3>
        <ul className="divide-y rounded-xl border text-sm bg-card">
          {batches.length === 0 && <li className="p-3 text-gray-500">None yet.</li>}
          {batches.map((b) => {
            const s = b.summary as { createdHouseholds?: number; createdCollections?: number } | null;
            return (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span>
                  {b.fileName} · {b.createdAt.toLocaleString("en-IN")} · {s?.createdHouseholds ?? 0} households, {s?.createdCollections ?? 0} amounts
                  {b.undoneAt && " · undone"}
                </span>
                {!b.undoneAt && (
                  <form action={undoImportAction}>
                    <input type="hidden" name="batchId" value={b.id} />
                    <button className="btn btn-secondary btn-sm">Undo</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
