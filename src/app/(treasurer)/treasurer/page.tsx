import Link from "next/link";
import { FundDashboard } from "@/components/FundDashboard";
import { TreasurerTasks } from "@/components/TreasurerTasks";
import { Icon } from "@/components/ui/Icon";
import { btn } from "@/components/ui/btn";
import { WelcomeHeader } from "@/components/WelcomeHeader";
import { requireRole } from "@/lib/auth";
import { getActiveFestival } from "@/modules/festivals/queries";

export default async function Page() {
  const user = await requireRole("TREASURER");
  const festival = await getActiveFestival();
  return (
    <FundDashboard
      header={
        <WelcomeHeader name={user.name} subtitle={festival?.name}>
          <Link href="/treasurer/expenses" className={btn("primary")}><Icon name="plus" />Add expense</Link>
          <Link href="/treasurer/bank" className={btn("secondary")}><Icon name="bank" />Deposit cash</Link>
          <Link href="/treasurer/handovers#record-cash" className={btn("secondary")}><Icon name="wallet" />Record cash received</Link>
        </WelcomeHeader>
      }
      renderTasks={(festivalId) => <TreasurerTasks festivalId={festivalId} />}
    />
  );
}
