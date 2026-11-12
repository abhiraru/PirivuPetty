import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import type { SessionUser } from "@/lib/permissions";
import { assignedAreaIds, canWorkOnArea } from "@/modules/collections/access";
import type { z } from "zod";
import type { householdSchema } from "./schema";

type Input = z.infer<typeof householdSchema>;

const clean = (i: Input) => ({
  headName: i.headName,
  phone: i.phone || null,
  altPhone: i.altPhone || null,
  address: i.address,
  areaId: i.areaId,
  notes: i.notes || null,
});

/** Admin may add anywhere; a collector only into an area assigned to them in the active festival. */
export async function createHousehold(user: SessionUser, input: Input) {
  if (user.role === "TREASURER") throw new Error("Treasurers cannot add households.");
  if (user.role === "COLLECTOR") {
    const festival = await db.festival.findFirst({ where: { status: "ACTIVE" } });
    if (!festival) throw new Error("There is no active festival.");
    if (!canWorkOnArea(user, input.areaId, await assignedAreaIds(festival.id, user.id))) throw new Error("You can only add households in your own area.");
  }
  const dup = await db.household.findFirst({
    where: { headName: { equals: input.headName, mode: "insensitive" }, address: { equals: input.address, mode: "insensitive" } },
  });
  if (dup) throw new Error("A household with this name and address already exists.");
  const actorId = user.id;
  return db.$transaction(async (tx) => {
    const h = await tx.household.create({ data: clean(input) });
    await writeAudit({ userId: actorId, action: "household.create", entity: "Household", entityId: h.id, after: clean(input) }, tx);
    return h;
  });
}

export async function updateHousehold(actorId: string, id: string, input: Input) {
  await db.$transaction(async (tx) => {
    const before = await tx.household.findUniqueOrThrow({ where: { id } });
    await tx.household.update({ where: { id }, data: clean(input) });
    await writeAudit(
      { userId: actorId, action: "household.update", entity: "Household", entityId: id, before: clean(before as unknown as Input), after: clean(input) },
      tx,
    );
  });
}

export async function setHouseholdActive(actorId: string, id: string, isActive: boolean) {
  await db.$transaction(async (tx) => {
    await tx.household.update({ where: { id }, data: { isActive } });
    await writeAudit({ userId: actorId, action: isActive ? "household.enable" : "household.disable", entity: "Household", entityId: id }, tx);
  });
}
