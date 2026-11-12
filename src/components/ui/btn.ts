export type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-solid";
export type BtnSize = "sm" | "md" | "lg";

/** Class string for anything clickable. Works on <button>, <Link> and <a>.  e.g. <Link className={btn("primary")}>  */
export function btn(variant: BtnVariant = "secondary", size: BtnSize = "md", extra = ""): string {
  return ["btn", `btn-${variant}`, size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "", extra].filter(Boolean).join(" ");
}

export const btnIcon = (variant: BtnVariant = "secondary", size: BtnSize = "md", extra = "") => btn(variant, size, `btn-icon ${extra}`.trim());
