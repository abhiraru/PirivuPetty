const PATHS = {
  home: "M3 11l9-8 9 8v10H3z",
  users: "M16 11a4 4 0 10-8 0M4 21a8 8 0 0116 0",
  wallet: "M3 7h18v13H3zM3 7l3-3h12l3 3M16 14h2",
  plus: "M12 5v14M5 12h14",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  back: "M19 12H5M11 6l-6 6 6 6",
  check: "M5 12l5 5 9-10",
  x: "M6 6l12 12M18 6L6 18",
  file: "M6 3h9l4 4v14H6zM14 3v5h5",
  upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
  download: "M12 4v12M7 11l5 5 5-5M5 20h14",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  out: "M9 4H5v16h4M16 8l4 4-4 4M20 12H9",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  bank: "M3 10l9-6 9 6M5 10v9M10 10v9M14 10v9M19 10v9M3 21h18",
  chart: "M4 20V10M10 20V4M16 20v-8M22 20H2",
  copy: "M9 9h11v11H9zM5 15V5h10",
  printer: "M7 9V3h10v6M7 17H4v-8h16v8h-3M7 14h10v7H7z",
} as const;

export type IconName = keyof typeof PATHS;

/** Line icon that inherits the text colour. Put it inside a .btn and the button sizes it. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
