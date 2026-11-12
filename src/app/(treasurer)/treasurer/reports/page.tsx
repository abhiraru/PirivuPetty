import { ReportsIndex } from "@/components/ReportView";
import { requireRole } from "@/lib/auth";

export default async function Page({ searchParams }: { searchParams: Promise<{ festival?: string }> }) {
  await requireRole("TREASURER");
  const { festival } = await searchParams;
  return <ReportsIndex basePath="/treasurer" festivalId={festival} />;
}
