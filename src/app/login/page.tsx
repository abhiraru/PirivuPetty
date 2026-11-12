"use client";

import { useActionState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(loginAction, undefined);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <div>
            <p className="text-lg font-extrabold leading-tight tracking-[0.1em]">PIRIVUPETTY</p>
            <p className="text-xs text-gray-500">The festival collection box</p>
          </div>
        </div>
        <ThemeToggle />
      </div>
      <div className="rounded-[22px] border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-extrabold tracking-tight">Sign in</h1>
        <p className="mb-4 mt-1 text-sm text-gray-500">Use the username and password given by your admin.</p>
        <form action={action} className="flex flex-col gap-3">
          <label className="text-sm font-semibold">
            Username
            <input name="username" autoComplete="username" required className="mt-1 w-full rounded-xl border p-2.5 font-normal" />
          </label>
          <label className="text-sm font-semibold">
            Password
            <input name="password" type="password" autoComplete="current-password" required className="mt-1 w-full rounded-xl border p-2.5 font-normal" />
          </label>
          {error && <p role="alert" className="rounded-xl bg-bad-bg p-2.5 text-sm text-bad">{error}</p>}
          <button disabled={pending} className="btn btn-primary">
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
