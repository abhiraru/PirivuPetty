"use client";

import { btn } from "./ui/btn";
import { Icon } from "./ui/Icon";

export function PrintButton() {
  return <button onClick={() => window.print()} className={btn("secondary", "sm")}>
      <Icon name="printer" />
      Print / save as PDF
    </button>;
}
