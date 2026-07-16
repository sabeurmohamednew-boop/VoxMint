import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";

import { isVerifiedGoogleIdentity, resolveAuthPolicy } from "@/lib/auth/policy";
import { getEnv, isDemoAuthEnabled, isE2eTestAuthEnabled } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";

const env = getEnv();
const authPolicy = resolveAuthPolicy({
  nodeEnv: env.NODE_ENV,
  developmentBypass: env.DEV_BYPASS_AUTH,
  e2eTestAuth: env.E2E_TEST_AUTH,
  googleClientId: env.AUTH_GOOGLE_ID,
  googleClientSecret: env.AUTH_GOOGLE_SECRET,
});
const providers: NextAuthConfig["providers"] = [];

if (authPolicy.googleEnabled && env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      // Google exposes a verified-email claim. Restrict sign-in below before
      // allowing Auth.js to link that identity to an existing unique email.
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (env.AUTH_EMAIL_SERVER && env.AUTH_EMAIL_FROM) {
  providers.push(Nodemailer({ server: env.AUTH_EMAIL_SERVER, from: env.AUTH_EMAIL_FROM }));
}

if (authPolicy.developmentEnabled && isDemoAuthEnabled()) {
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

if (authPolicy.e2eEnabled && isE2eTestAuthEnabled()) {
  providers.push(
    Credentials({
      id: "e2e",
      name: "Isolated test account",
      credentials: { userKey: { label: "Test user", type: "text" } },
      async authorize(credentials) {
        if (!isE2eTestAuthEnabled()) return null;
        const parsed = z.object({ userKey: z.enum(["user-a", "user-b"]) }).safeParse(credentials);
        if (!parsed.success) return null;
        const suffix = parsed.data.userKey === "user-a" ? "a" : "b";
        return prisma.user.upsert({
          where: { email: `playwright-${suffix}@voxmint.test` },
          update: { deletedAt: null },
          create: {
            email: `playwright-${suffix}@voxmint.test`,
            name: `Test User ${suffix.toUpperCase()}`,
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
    signIn({ account, profile }) {
      return isVerifiedGoogleIdentity({
        provider: account?.provider,
        emailVerified: profile?.email_verified,
      });
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.emailVerified = "emailVerified" in user && Boolean(user.emailVerified);
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
        session.user.emailVerifiedByProvider = token.emailVerified === true;
      }
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
