import type { Role } from "@prisma/client";

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  TREASURER: "/treasurer",
  COLLECTOR: "/collector",
};

export type SessionUser = { id: string; name: string; role: Role };

export class ForbiddenError extends Error {
  constructor() {
    super("You do not have permission to do that.");
  }
}

export function assertRole(user: SessionUser | null | undefined, ...allowed: Role[]): SessionUser {
  if (!user || !allowed.includes(user.role)) throw new ForbiddenError();
  return user;
}
