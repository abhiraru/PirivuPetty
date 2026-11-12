import { CloseChecklist } from "@/components/CloseChecklist";
import { requireRole } from "@/lib/auth";
import { getActiveFestival } from "@/modules/festivals/queries";

export default async function Page() {
  await requireRole("TREASURER");
  const f = await getActiveFestival();
  if (!f) return <p>No festival is active right now.</p>;
  return <CloseChecklist festival={f} canClose={false} />;
}
