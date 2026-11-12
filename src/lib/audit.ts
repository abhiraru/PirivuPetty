import type { Prisma } from "@prisma/client";
import { db } from "./db";

type Client = Prisma.TransactionClient | typeof db;

export async function writeAudit(
  entry: {
    userId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
  },
  client: Client = db,
) {
  await client.auditLog.create({ data: entry });
}
