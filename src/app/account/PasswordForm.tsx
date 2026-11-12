"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/modules/users/actions";

export function PasswordForm() {
  const [s, a, p] = useActionState(changePasswordAction, {});
  return (
    <form action={a} className="flex max-w-sm flex-col gap-2">
      <input name="current" type="password" placeholder="Current password" autoComplete="current-password" required className="rounded-xl border p-2 bg-card" />
      <input name="next" type="password" placeholder="New password (8+ characters)" autoComplete="new-password" required className="rounded-xl border p-2 bg-card" />
      <input name="confirm" type="password" placeholder="Repeat new password" autoComplete="new-password" required className="rounded-xl border p-2 bg-card" />
      <button disabled={p} className="btn btn-primary">Change password</button>
      {s.error && <p className="text-sm text-red-600">{s.error}</p>}
      {s.ok && <p className="text-sm text-green-700">Password changed.</p>}
    </form>
  );
}
