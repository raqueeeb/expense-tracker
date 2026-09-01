import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { loginSchema } from "./validation";
import { DUMMY_PASSWORD_HASH } from "./dummy-hash";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        // Compare against a real hash when the user does not exist so that a
        // missing account and a wrong password take the same time to answer.
        // This MUST be a syntactically valid bcrypt hash at the same cost as
        // registration (12): bcrypt.compare() rejects a malformed hash in
        // microseconds instead of doing the work, which would turn this line
        // into the user-enumeration oracle it is meant to prevent.
        // Guarded by src/lib/dummy-hash.test.ts.
        const hash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
        const ok = await bcrypt.compare(password, hash);
        if (!user || !ok) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
});
