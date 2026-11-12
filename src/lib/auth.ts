import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Role } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { isLockedOut, recordFailedLogin } from "./loginGuard";
import { assertRole, type SessionUser } from "./permissions";

declare module "next-auth" {
  interface User {
    role: Role;
  }
  interface Session {
    user: { id: string; name: string; role: Role };
  }
}

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const username = parsed.data.username.trim().toLowerCase();
        if (await isLockedOut(username)) return null;
        const user = await db.user.findUnique({ where: { username } });
        const ok = !!user && user.isActive && (await bcrypt.compare(parsed.data.password, user.passwordHash));
        if (!user || !ok) {
          await recordFailedLogin(username);
          return null;
        }
        return { id: user.id, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
});

/** Current user from the session, re-checked against the database so disabled accounts lose access immediately. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.isActive) return null;
  return { id: user.id, name: user.name, role: user.role };
}

export async function requireRole(...allowed: Role[]): Promise<SessionUser> {
  return assertRole(await getCurrentUser(), ...allowed);
}
