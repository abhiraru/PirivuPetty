import { requireRole } from "@/lib/auth";
import { WorkListPage } from "@/components/WorkListPage";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; area?: string; status?: string; page?: string; size?: string }> }) {
  const user = await requireRole("COLLECTOR");
  return <WorkListPage user={user} basePath="/collector" listPath="/collector/households" params={await searchParams} />;
}
