import { db } from "./db";

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;

const key = (username: string) => username.trim().toLowerCase().slice(0, 100);

/** True when this username has failed too many times recently. While locked, attempts are refused and not recorded, so the log cannot be flooded. */
export async function isLockedOut(username: string): Promise<boolean> {
  const since = new Date(Date.now() - LOCKOUT_MINUTES * 60_000);
  const failures = await db.auditLog.count({ where: { action: "login.failed", entityId: key(username), createdAt: { gt: since } } });
  return failures >= MAX_FAILED_LOGINS;
}

export async function recordFailedLogin(username: string) {
  await db.auditLog.create({ data: { action: "login.failed", entity: "Login", entityId: key(username) } });
}
