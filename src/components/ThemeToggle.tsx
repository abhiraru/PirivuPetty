"use client";

import { btn } from "./ui/btn";

const SUN = "M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z";
const MOON = "M21 12.8A8.5 8.5 0 1 1 11.2 3a6.7 6.7 0 0 0 9.8 9.8Z";

/** Sun in dark mode (click for light), moon in light mode (click for dark). Which icon shows is decided in CSS from the theme, so there is no flash on load. */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = dark ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  const icon = "h-[18px] w-[18px] fill-none stroke-current";
  return (
    <button onClick={toggle} aria-label="Switch between light and dark mode" title="Switch light / dark" className={`theme-toggle ${btn("secondary", "sm", "btn-icon")}`}>
      <svg viewBox="0 0 24 24" className={`theme-moon ${icon}`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={MOON} /></svg>
      <svg viewBox="0 0 24 24" className={`theme-sun ${icon}`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={SUN} /></svg>
    </button>
  );
}
