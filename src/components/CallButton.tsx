"use client";

import { useState } from "react";
import { btn, type BtnVariant } from "./ui/btn";
import { Icon } from "./ui/Icon";

/**
 * On a touch screen it opens the dialler. Anywhere else (a computer with a mouse and keyboard) it copies the number instead, since there is nothing to dial with.
 */
export function CallButton({ phone, name, variant = "secondary" }: { phone: string; name: string; variant?: BtnVariant }) {
  const [state, setState] = useState<"idle" | "copied" | "shown">("idle");
  const dial = phone.replace(/[^\d+]/g, "");
  if (!dial) return null;

  async function onClick(e: React.MouseEvent) {
    if (window.matchMedia("(pointer: coarse)").matches) return; // touch screen: let the tel: link open the dialler
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(phone);
      setState("copied");
    } catch {
      setState("shown"); // clipboard blocked: show the number on the button so it can still be read
    }
    setTimeout(() => setState("idle"), 4000);
  }

  return (
    <a href={`tel:${dial}`} onClick={onClick} className={btn(variant, "sm")} title={phone} aria-label={`Call ${name} on ${phone}`}>
      <Icon name={state === "copied" ? "check" : "phone"} />
      {state === "copied" ? "Number copied" : state === "shown" ? phone : "Call"}
    </a>
  );
}
