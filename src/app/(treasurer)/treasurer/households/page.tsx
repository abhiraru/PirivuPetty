import { requireRole } from "@/lib/auth";
import { WorkListPage } from "@/components/WorkListPage";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; area?: string; status?: string; page?: string; size?: string }> }) {
  const user = await requireRole("TREASURER");
  return <WorkListPage user={user} basePath="/treasurer" listPath="/treasurer/households" params={await searchParams} />;
}
