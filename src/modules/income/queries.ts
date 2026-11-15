import { db } from "@/lib/db";

export function listIncome(festivalId: string) {
  return db.otherIncome.findMany({ where: { festivalId }, orderBy: [{ receivedOn: "desc" }, { createdAt: "desc" }], take: 300 });
}
