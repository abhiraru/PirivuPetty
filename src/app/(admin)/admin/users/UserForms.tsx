"use client";

import { useActionState } from "react";
import { createUserAction, resetPasswordAction } from "@/modules/users/actions";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, {});
  return (
    <form action={action} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-2 bg-card">
      <input name="name" placeholder="Full name" required className="rounded-xl border p-2 bg-card" />
      <input name="username" placeholder="Username" required className="rounded-xl border p-2 bg-card" />
      <input name="phone" placeholder="Phone (optional)" className="rounded-xl border p-2 bg-card" />
      <input name="password" type="password" placeholder="Initial password" required className="rounded-xl border p-2 bg-card" />
      <select name="role" className="rounded-xl border p-2 bg-card">
        <option value="COLLECTOR">Collector</option>
        <option value="TREASURER">Treasurer</option>
      </select>
      <button disabled={pending} className="btn btn-primary">Create user</button>
      {state.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-700 sm:col-span-2">User created.</p>}
    </form>
  );
}

export function ResetPasswordForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, {});
  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <input name="password" type="password" placeholder="New password" className="w-32 rounded-xl border p-1 text-sm bg-card" />
      <button disabled={pending} className="btn btn-secondary btn-sm">Reset</button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
      {state.ok && <span className="text-xs text-green-700">Done</span>}
    </form>
  );
}
