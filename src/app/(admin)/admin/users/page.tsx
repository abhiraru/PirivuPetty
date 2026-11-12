import { toggleUserAction } from "@/modules/users/actions";
import { listUsers } from "@/modules/users/queries";
import { CreateUserForm, ResetPasswordForm } from "./UserForms";
import { PageHeader } from "@/components/PageHeader";

export default async function UsersPage() {
  const users = await listUsers();
  return (
    <div className="space-y-6">
      <PageHeader title="Users" />
      <CreateUserForm />
      <ul className="divide-y rounded-xl border bg-card">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <p className="font-medium">
                {u.name} <span className="text-sm text-gray-500">({u.username})</span>
              </p>
              <p className="text-sm text-gray-500">
                {u.role.toLowerCase()}
                {u.phone ? ` · ${u.phone}` : ""}
                {u.isActive ? "" : " · disabled"}
              </p>
            </div>
            {u.role !== "ADMIN" && (
              <div className="flex items-center gap-3">
                <ResetPasswordForm id={u.id} />
                <form action={toggleUserAction}>
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="active" value={String(!u.isActive)} />
                  <button className="btn btn-secondary btn-sm">{u.isActive ? "Disable" : "Enable"}</button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
