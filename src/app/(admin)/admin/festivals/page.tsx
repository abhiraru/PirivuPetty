import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { listFestivals } from "@/modules/festivals/queries";
import { previousClosing, suggestedOpening } from "@/modules/festivals/service";
import { CloseChecklist } from "@/components/CloseChecklist";
import { ReopenForm } from "@/components/CloseForms";
import { ActivateButton, CreateFestivalForm, OpeningForm } from "./FestivalForms";
import { PageHeader } from "@/components/PageHeader";

export default async function FestivalsPage() {
  const [festivals, suggested] = await Promise.all([listFestivals(), suggestedOpening()]);
  const active = festivals.find((f) => f.status === "ACTIVE");
  // What activation copied across, shown for as long as that festival is the active one.
  const activation = active ? await db.auditLog.findFirst({ where: { action: "festival.activate", entityId: active.id }, orderBy: { createdAt: "desc" } }) : null;
  const copied = (activation?.after ?? null) as { assignmentsCopied?: number; from?: string | null } | null;
  const drafts = festivals.filter((f) => f.status === "DRAFT" && !f.isHistorical);
  const previousByDraft = new Map(await Promise.all(drafts.map(async (f) => [f.id, await previousClosing(f.year)] as const)));
  const latestClosed = festivals.find((f) => f.status === "CLOSED" && !f.isHistorical);
  return (
    <div className="space-y-6">
      <PageHeader title="Festivals" />
      {active && copied?.assignmentsCopied ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warn-bg p-4 text-sm text-warn">
          <span>
            {copied.assignmentsCopied} collector area assignment{copied.assignmentsCopied === 1 ? " was" : "s were"} copied from {copied.from} when {active.name} was activated. Check they are still right.
          </span>
          <Link href="/admin/areas" className="btn btn-secondary btn-sm">Review areas</Link>
        </div>
      ) : null}
      {active && <CloseChecklist festival={active} canClose />}
      <CreateFestivalForm suggested={suggested} />
      <ul className="divide-y rounded-xl border bg-card">
        {festivals.length === 0 && <li className="p-3 text-gray-500">No festivals yet.</li>}
        {festivals.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <p className="font-medium">{f.name} <span className="text-sm text-gray-500">({f.year})</span></p>
              <p className="text-sm text-gray-500">
                {f.isHistorical ? "Imported history" : f.status.toLowerCase()}
                {!f.isHistorical && ` · opening cash ${formatINR(f.openingCash)}, bank ${formatINR(f.openingBank)}`}
                {f.closingCash !== null && ` · closed with cash ${formatINR(f.closingCash)}, bank ${formatINR(f.closingBank ?? 0)}`}
              </p>
            </div>
            {f.status === "DRAFT" && !f.isHistorical && <ActivateButton id={f.id} />}
            {f.status === "DRAFT" && !f.isHistorical && (
              <OpeningForm id={f.id} cash={f.openingCash} bank={f.openingBank} previous={previousByDraft.get(f.id) ?? null} />
            )}
            {f.id === latestClosed?.id && !active && <ReopenForm id={f.id} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
