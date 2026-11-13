"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { loadDemoAction, removeDemoAction } from "@/modules/demo/actions";

export function LoadDemoButton({ blockedReason }: { blockedReason?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="space-y-2">
      <button
        disabled={pending || !!blockedReason}
        onClick={() =>
          start(async () => {
            setError("");
            const r = await loadDemoAction();
            if (r.error) setError(r.error);
            else router.refresh();
          })
        }
        className="btn btn-primary btn-lg"
      >
        {pending ? <span className="btn-spinner" /> : <Icon name="plus" />}
        {pending ? "Loading demo data..." : "Load demo data"}
      </button>
      {blockedReason && <p className="text-sm text-warn">{blockedReason}</p>}
      {error && <p role="alert" className="rounded-xl bg-bad-bg p-3 text-sm text-bad">{error}</p>}
    </div>
  );
}

export function RemoveDemoButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  if (!asking) {
    return (
      <button onClick={() => setAsking(true)} className="btn btn-danger">
        <Icon name="trash" />Remove demo data
      </button>
    );
  }
  return (
    <div className="space-y-3 rounded-2xl bg-bad-bg p-4 text-bad">
      <p className="text-sm font-semibold">Remove all demo data? This deletes the demo festivals, households, payments, expenses and the four demo accounts, plus anything entered while demonstrating. Real records are not touched.</p>
      <div className="flex flex-wrap gap-2">
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError("");
              const r = await removeDemoAction();
              if (r.error) setError(r.error);
              else router.refresh();
            })
          }
          className="btn btn-danger-solid"
        >
          {pending ? <span className="btn-spinner" /> : <Icon name="check" />}
          {pending ? "Removing..." : "Yes, remove it"}
        </button>
        <button disabled={pending} onClick={() => setAsking(false)} className="btn btn-secondary">Cancel</button>
      </div>
      {error && <p role="alert" className="text-sm">{error}</p>}
    </div>
  );
}
