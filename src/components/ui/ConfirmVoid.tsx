"use client";

import { useState } from "react";
import { Icon } from "./Icon";

/**
 * Destructive actions ask first, in place: a Void button that opens a reason box with an explicit Confirm and a Cancel.
 * `children` is the form's hidden fields; `pending` locks the buttons while saving.
 */
export function ConfirmVoid({ pending, error, children }: { pending: boolean; error?: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-danger btn-sm">
        <Icon name="trash" />Void
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      {children}
      <input name="reason" placeholder="Reason for voiding" required autoFocus aria-label="Reason for voiding" className="h-8 w-48 rounded-xl border px-3 text-sm" />
      <button disabled={pending} className="btn btn-danger-solid btn-sm"><Icon name="check" />Confirm void</button>
      <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
      {error && <span className="text-xs text-bad">{error}</span>}
    </span>
  );
}
