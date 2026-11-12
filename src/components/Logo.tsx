/** PIRIVUPETTY mark: a collection box with a coin dropping into the slot, on a teal tile. Colours are fixed so it reads on light and dark pages. */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="15" fill="#0d3b3e" />
      <circle cx="32" cy="15" r="7.5" fill="#f3fbf9" />
      <circle cx="32" cy="15" r="4.4" fill="none" stroke="#d9831a" strokeWidth="1.6" />
      <rect x="12" y="27" width="40" height="26" rx="5" fill="#f2a445" />
      <rect x="9" y="22" width="46" height="10" rx="4.5" fill="#d9831a" />
      <rect x="23" y="25.4" width="18" height="3.2" rx="1.6" fill="#0d3b3e" />
      <rect x="28" y="38" width="8" height="9" rx="2.5" fill="#0d3b3e" />
      <circle cx="32" cy="41.5" r="1.7" fill="#f2a445" />
    </svg>
  );
}
