import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/server/db";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

// ─── Startup checks ───────────────────────────────────────────────────
if (!process.env.AUTH_SECRET) {
  console.error("[Auth] ❌ AUTH_SECRET is NOT set — NextAuth will NOT work.");
}
if (!process.env.GOOGLE_CLIENT_ID) {
  console.error("[Auth] ❌ GOOGLE_CLIENT_ID is NOT set — Google sign-in will FAIL.");
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
  console.error("[Auth] ❌ GOOGLE_CLIENT_SECRET is NOT set — Google sign-in will FAIL.");
}

// Log the detected AUTH_URL / NEXTAUTH_URL for debugging redirect URI issues
console.log("[Auth] AUTH_URL env:", process.env.AUTH_URL ?? "(not set)");
console.log("[Auth] NEXTAUTH_URL env:", process.env.NEXTAUTH_URL ?? "(not set)");
console.log("[Auth] NODE_ENV:", process.env.NODE_ENV);
console.log("[Auth] VERCEL_URL:", process.env.VERCEL_URL ?? "(not set)");

// ─── Providers ─────────────────────────────────────────────────────────
const providers: any[] = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        console.log("[Auth] Credentials missing");
        return null;
      }

      try {
        const email = credentials.email as string;
        console.log("[Auth] Attempting sign-in for:", email);

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user) {
          console.log("[Auth] User not found:", email);
          return null;
        }

        if (!user.password) {
          console.log("[Auth] User has no password set (OAuth-only account):", email);
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          console.log("[Auth] Invalid password for:", email);
          return null;
        }

        // Check email domain restriction
        if (!user.email?.endsWith("@position2.com")) {
          console.log("[Auth] Email domain mismatch:", user.email);
          return null;
        }

        console.log("[Auth] Credentials authorized successfully for:", user.email);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      } catch (error) {
        console.error("[Auth] Error in authorize:", error);
        return null;
      }
    },
  }),
];

// Add Google provider — ALWAYS add it if env vars are present
const hasGoogleCredentials = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
console.log("[Auth] Google provider credentials available:", hasGoogleCredentials);

if (hasGoogleCredentials) {
  providers.unshift(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Allow linking Google accounts to existing users with the same email.
      // This is safe because: 1) domain is restricted to @position2.com,
      // 2) Google verifies the email, 3) it's a trusted corporate domain.
      // Without this, users created via credentials can NEVER sign in with Google.
      allowDangerousEmailAccountLinking: true,
    })
  );
  console.log("[Auth] ✅ Google provider added (with email account linking enabled)");
} else {
  console.error("[Auth] ⚠️ Google provider NOT added — missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
}

console.log("[Auth] Total providers configured:", providers.length, "->", providers.map((p: any) => p.id || p.name || "unknown").join(", "));

// ─── NextAuth configuration ───────────────────────────────────────────
export const { handlers, auth, signIn, signOut } = NextAuth({
  // @ts-expect-error - Type mismatch between @auth/prisma-adapter and next-auth v5 beta
  adapter: PrismaAdapter(db),
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("[Auth] signIn callback - email:", user.email, "provider:", account?.provider);
      
      try {
        // For credentials provider, the authorize function already checks the domain
        if (account?.provider === "credentials") {
          console.log("[Auth] Credentials provider — allowing (already validated in authorize)");
          return true;
        }

        // For OAuth providers (Google), check the email domain
        const email = user.email || profile?.email as string | undefined;
        if (email?.endsWith("@position2.com")) {
          console.log("[Auth] ✅ Sign-in allowed for:", email);
          return true;
        }

        console.log("[Auth] ❌ Sign-in denied — email domain mismatch:", email);
        return false; // Redirects to /auth/error?error=AccessDenied
      } catch (error) {
        console.error("[Auth] ❌ Error in signIn callback:", error);
        return false;
      }
    },
    async jwt({ token, user, account, trigger }) {
      console.log("[Auth] JWT callback - trigger:", trigger, "hasUser:", !!user, "hasAccount:", !!account);
      
      if (user) {
        token.id = user.id;
        // For OAuth sign-in, the user object from the adapter may not have 'role'
        // Fetch it from the database if needed
        if (user.role) {
          token.role = user.role;
        } else if (user.id) {
          // User came from OAuth — fetch role from database
          try {
            const dbUser = await db.user.findUnique({
              where: { id: user.id },
              select: { role: true },
            });
            token.role = dbUser?.role || "user";
            console.log("[Auth] Fetched role from DB for OAuth user:", token.role);
          } catch (err) {
            console.error("[Auth] Error fetching user role:", err);
            token.role = "user";
          }
        }
      }
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) || "user";
      }
      return session;
    },
  },
  // Enable debug logging in ALL environments (check Vercel Function Logs)
  debug: true,
});
