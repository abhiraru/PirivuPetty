"use client";

import { useActionState } from "react";
import { confirmImportAction, previewImportAction, type PreviewState } from "@/modules/imports/actions";

export function ImportWizard() {
  const [preview, previewAction, previewing] = useActionState<PreviewState, FormData>(previewImportAction, {});
  const [result, confirmAction, confirming] = useActionState<PreviewState, FormData>(confirmImportAction, {});

  if (result.done) {
    const d = result.done;
    return (
      <div className="space-y-2 rounded-xl border border-green-600 p-3 bg-card">
        <p className="font-medium text-green-700">Import finished.</p>
        <ul className="list-disc pl-5 text-sm">
          <li>{d.createdHouseholds} households created</li>
          <li>{d.createdCollections} past amounts recorded</li>
          {d.skippedCollections > 0 && <li>{d.skippedCollections} skipped (that household already had an amount for that year)</li>}
        </ul>
        <p className="text-sm">You can undo this import from the list below.</p>
      </div>
    );
  }

  const valid = preview.results?.flatMap((r) => (r.clean ? [r.clean] : [])) ?? [];
  const bad = preview.results?.filter((r) => r.error) ?? [];
  const plan = preview.plan;

  return (
    <div className="space-y-4">
      <form action={previewAction} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-2 bg-card">
        <input type="file" name="file" accept=".xlsx,.csv" required className="sm:col-span-2" />
        <label className="text-sm">
          Year for rows without a year column (optional)
          <input name="defaultYear" type="number" placeholder="e.g. 2025" className="mt-1 w-full rounded-xl border p-2 bg-card" />
        </label>
        <button disabled={previewing} className="btn btn-primary self-end">
          {previewing ? "Checking..." : "Check file"}
        </button>
      </form>
      {preview.error && <p className="text-sm text-red-600">{preview.error}</p>}

      {plan && (
        <div className="space-y-3">
          <div className="rounded-xl border p-3 text-sm bg-card">
            <p className="mb-1 font-medium">{preview.fileName}: {valid.length} good rows, {bad.length} with problems</p>
            <ul className="list-disc pl-5">
              <li>{plan.newHouseholds} new households, {plan.existingHouseholds} already exist (matched by name + address)</li>
              <li>{plan.collectionsToCreate} past amounts to record{plan.collectionsSkipped > 0 ? `, ${plan.collectionsSkipped} skipped as already recorded` : ""}</li>
              {plan.newAreas.length > 0 && <li>New areas will be created: {plan.newAreas.join(", ")}</li>}
              {plan.newFestivalYears.length > 0 && <li>History will be added for years: {plan.newFestivalYears.join(", ")}</li>}
            </ul>
          </div>

          {bad.length > 0 && (
            <div className="rounded-xl border border-red-300 p-3 text-sm bg-card">
              <p className="mb-1 font-medium text-red-700">These rows will be skipped. Fix them in the file and upload again, or continue without them.</p>
              <ul className="max-h-60 overflow-auto">
                {bad.map((r) => (
                  <li key={r.line}>Row {r.line} ({r.row.name || "no name"}): {r.error}</li>
                ))}
              </ul>
            </div>
          )}

          {valid.length > 0 && (
            <form action={confirmAction}>
              <input type="hidden" name="rows" value={JSON.stringify(valid)} />
              <input type="hidden" name="fileName" value={preview.fileName} />
              <button disabled={confirming} className="btn btn-primary">
                {confirming ? "Importing..." : `Import ${valid.length} rows`}
              </button>
              {result.error && <p className="mt-2 text-sm text-red-600">{result.error}</p>}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
