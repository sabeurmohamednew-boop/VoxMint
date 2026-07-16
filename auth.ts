import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";

import { getEnv, isDemoAuthEnabled } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";

const env = getEnv();
const providers: NextAuthConfig["providers"] = [];

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET }),
  );
}

if (env.AUTH_EMAIL_SERVER && env.AUTH_EMAIL_FROM) {
  providers.push(Nodemailer({ server: env.AUTH_EMAIL_SERVER, from: env.AUTH_EMAIL_FROM }));
}

if (isDemoAuthEnabled()) {
  providers.push(
    Credentials({
      id: "demo",
      name: "Demo account",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const parsed = z
          .object({ email: z.string().email().default("demo@voxmint.local") })
          .safeParse(credentials);
        if (!parsed.success || !isDemoAuthEnabled()) return null;

        return prisma.user.upsert({
          where: { email: parsed.data.email },
          update: { deletedAt: null },
          create: {
            email: parsed.data.email,
            name: "Maya Chen",
            emailVerified: new Date(),
          },
        });
      },
    }),
  );
}

const protectedPrefixes = ["/dashboard", "/voices", "/history", "/settings", "/usage", "/billing"];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: env.AUTH_SECRET ?? "voxmint-development-secret-change-me",
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") session.user.id = token.id;
      return session;
    },
    authorized({ auth: session, request }) {
      const isProtected = protectedPrefixes.some((prefix) =>
        request.nextUrl.pathname.startsWith(prefix),
      );
      if (!isProtected) return true;
      return Boolean(session?.user?.id);
    },
  },
});
