import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import type { CreateUserInput } from "./schema";

export async function createUser(actorId: string, input: CreateUserInput) {
  const exists = await db.user.findUnique({ where: { username: input.username } });
  if (exists) throw new Error("That username is already taken.");

  const passwordHash = await bcrypt.hash(input.password, 10);
  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        username: input.username,
        phone: input.phone || null,
        passwordHash,
        role: input.role,
      },
    });
    await writeAudit(
      { userId: actorId, action: "user.create", entity: "User", entityId: user.id, after: { username: user.username, role: user.role } },
      tx,
    );
    return user;
  });
}

export async function setUserActive(actorId: string, userId: string, isActive: boolean) {
  const target = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (target.role === "ADMIN") throw new Error("Admin accounts cannot be disabled here.");
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { isActive } });
    await writeAudit(
      { userId: actorId, action: isActive ? "user.enable" : "user.disable", entity: "User", entityId: userId },
      tx,
    );
  });
}

export async function resetPassword(actorId: string, userId: string, newPassword: string) {
  if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.");
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await writeAudit({ userId: actorId, action: "user.reset_password", entity: "User", entityId: userId }, tx);
  });
}

/** A user changes their own password. Requires the current one. */
export async function changeOwnPassword(userId: string, current: string, next: string) {
  if (next.length < 8) throw new Error("The new password must be at least 8 characters.");
  if (next === current) throw new Error("Choose a password different from the current one.");
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(current, user.passwordHash))) throw new Error("The current password is wrong.");
  const passwordHash = await bcrypt.hash(next, 10);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await writeAudit({ userId, action: "user.change_password", entity: "User", entityId: userId }, tx);
  });
}
