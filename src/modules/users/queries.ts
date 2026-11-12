import { db } from "@/lib/db";

export function listUsers() {
  return db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, username: true, phone: true, role: true, isActive: true },
  });
}
