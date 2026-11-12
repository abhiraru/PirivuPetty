import { db } from "@/lib/db";

export function listFestivals() {
  return db.festival.findMany({ orderBy: { year: "desc" } });
}

/** The festival currently being collected for. */
export function getActiveFestival() {
  return db.festival.findFirst({ where: { status: "ACTIVE" } });
}
