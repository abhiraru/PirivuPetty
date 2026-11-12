import { ReportsIndex } from "@/components/ReportView";
import { requireRole } from "@/lib/auth";

export default async function Page({ searchParams }: { searchParams: Promise<{ festival?: string }> }) {
  await requireRole("ADMIN");
  const { festival } = await searchParams;
  return <ReportsIndex basePath="/admin" festivalId={festival} />;
}
