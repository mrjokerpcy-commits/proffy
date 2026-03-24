import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { sendWelcomeEmail } from "@/lib/email";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});


const isProd = process.env.NODE_ENV === "production" && (process.env.NEXTAUTH_URL ?? "").startsWith("https://");

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? "dev-secret-change-in-prod",
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days

  cookies: {
    sessionToken: {
      name: isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: isProd,
        maxAge: 30 * 24 * 60 * 60, // 30 days — keep user logged in
      },
    },
    callbackUrl: {
      name: isProd ? "__Secure-next-auth.callback-url" : "next-auth.callback-url",
      options: { sameSite: "lax" as const, path: "/", secure: isProd },
    },
    csrfToken: {
      name: isProd ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure: isProd },
    },
  },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),

    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Guard against bcrypt DoS via extremely long passwords
        if (credentials.password.length > 128) return null;

        const normalizedEmail = credentials.email.toLowerCase().trim();
        const { rows } = await pool.query(
          "SELECT * FROM users WHERE email = $1",
          [normalizedEmail]
        );
        const user = rows[0];
        if (!user || !user.password_hash) return null;

        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      if (user && account?.provider !== "google") {
        token.id = user.id;
      }
      // Handle Google OAuth — upsert user in DB
      if (account?.provider === "google" && user) {
        try {
          const { rows } = await pool.query(
            `INSERT INTO users (email, name, image, email_verified)
             VALUES ($1, $2, $3, true)
             ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, image = EXCLUDED.image, email_verified = true
             RETURNING id, (xmax = 0) AS is_new`,
            [user.email, user.name, user.image]
          );
          token.id = rows[0].id;
          // Send welcome email only on first-ever Google login
          if (rows[0].is_new) {
            sendWelcomeEmail(user.email!, user.name ?? undefined).catch(() => {});
          }
        } catch (err) {
          console.error("Google OAuth DB upsert failed:", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
        // Fetch current plan fresh on every session check
        try {
          const { rows } = await pool.query(
            "SELECT plan FROM subscriptions WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
            [token.id]
          );
          (session.user as any).plan = rows[0]?.plan ?? "free";
        } catch {
          (session.user as any).plan = "free";
        }
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
};
