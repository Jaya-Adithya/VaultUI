import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/server/db";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables");
}
if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET is required in production");
}
// Required in production so Google OAuth redirect_uri matches exactly what you added in Google Console
if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_URL) {
  throw new Error(
    "NEXTAUTH_URL is required in production. Set it to https://vaultui.vercel.app (no trailing slash) in Vercel → Settings → Environment Variables."
  );
}
if (process.env.NEXTAUTH_URL?.endsWith("/")) {
  throw new Error("NEXTAUTH_URL must not have a trailing slash.");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db) as Adapter,
  trustHost: true, // Required on Vercel so callback URL is built from request host
  session: {
    strategy: "jwt", // Use JWT for middleware compatibility
  },
  cookies: {
    sessionToken: {
      options: {
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        // Check email domain restriction
        if (!user.email?.endsWith("@position2.com")) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) {
        if (process.env.NODE_ENV === "development" || process.env.AUTH_DEBUG) {
          console.warn("[Auth] Sign-in denied: no email in profile (Google may not have granted email scope)");
        }
        return false;
      }
      if (user.email.endsWith("@position2.com")) {
        return true;
      }
      if (process.env.NODE_ENV === "development" || process.env.AUTH_DEBUG) {
        console.warn("[Auth] Sign-in denied: email domain must be @position2.com", user.email);
      }
      return false;
    },
    async jwt({ token, user, account }) {
      // Persist the OAuth account_id and the access_token to the token right after signin
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as string) ?? "user";
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development" || process.env.AUTH_DEBUG === "1",
});


