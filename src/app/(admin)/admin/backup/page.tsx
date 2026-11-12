import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";

export default async function BackupPage() {
  await requireRole("ADMIN");
  const last = await db.auditLog.findFirst({ where: { action: "backup.export" }, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } });
  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Backup" />

      <section className="space-y-2 rounded-[18px] border bg-card p-5">
        <h3 className="font-bold">Download all data</h3>
        <p className="text-sm text-gray-500">One Excel file with every household, promise, payment, handover, bank entry, expense and audit record. Passwords are not included. Keep a copy somewhere safe after each festival, and again before any big change.</p>
        <p className="text-sm text-gray-500">{last ? `Last downloaded ${last.createdAt.toLocaleString("en-IN")} by ${last.user?.name ?? "someone"}.` : "Never downloaded yet."}</p>
        <a href="/api/backup/export" className="btn btn-primary">Download backup (Excel)</a>
      </section>

      <section className="space-y-2 rounded-[18px] border bg-card p-5">
        <h3 className="font-bold">What this does not cover</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-500">
          <li>It is a copy for safekeeping and reference. It cannot be loaded back into the app by itself. Restoring the app uses the database backup described in the deployment guide.</li>
          <li>Photos of bills are stored separately and are not inside this file.</li>
        </ul>
      </section>
    </div>
  );
}
