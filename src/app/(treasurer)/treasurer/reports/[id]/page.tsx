import { ReportScreen } from "@/components/ReportScreen";
import { requireRole } from "@/lib/auth";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole("TREASURER");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <ReportScreen basePath="/treasurer" id={id} searchParams={sp} />;
}
