"use client";

import { useEffect, useState } from "react";
import { firstName, greeting } from "@/lib/greeting";

/**
 * "Good evening, Ravi" with today's date and a line of context, plus the page's main buttons.
 * The greeting and date use the visitor's own clock (the server can be in another timezone), so they are filled in after load;
 * until then it shows a plain "Hi, Ravi".
 */
export function WelcomeHeader({ name, subtitle, children }: { name: string; subtitle?: string; children?: React.ReactNode }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the visitor's clock once after load
    setNow(new Date());
  }, []);

  const hello = now ? greeting(name, now.getHours()) : `Hi, ${firstName(name)}`;
  const date = now?.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const sub = [date, subtitle].filter(Boolean).join(" · ");

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-[28px]">{hello}</h1>
        {sub && <p className="mt-1 text-sm text-gray-500">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2 max-sm:w-full [&>*]:max-sm:flex-1">{children}</div>}
    </header>
  );
}
