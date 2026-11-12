import { formatINR } from "@/lib/money";
import { listFestivals } from "@/modules/festivals/queries";
import { suggestedOpening } from "@/modules/festivals/service";
import { CloseChecklist } from "@/components/CloseChecklist";
import { ReopenForm } from "@/components/CloseForms";
import { ActivateButton, CreateFestivalForm } from "./FestivalForms";
import { PageHeader } from "@/components/PageHeader";

export default async function FestivalsPage() {
  const [festivals, suggested] = await Promise.all([listFestivals(), suggestedOpening()]);
  const active = festivals.find((f) => f.status === "ACTIVE");
  const latestClosed = festivals.find((f) => f.status === "CLOSED" && !f.isHistorical);
  return (
    <div className="space-y-6">
      <PageHeader title="Festivals" />
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
            {f.id === latestClosed?.id && !active && <ReopenForm id={f.id} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
