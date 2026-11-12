import { FundDashboard } from "@/components/FundDashboard";
import { PageHeader } from "@/components/PageHeader";
import { requireRole } from "@/lib/auth";

export default async function Page() {
  await requireRole("ADMIN");
  return <FundDashboard header={<PageHeader title="Fund summary" subtitle="Read only. The treasurer records the money." />} />;
}
