// lib/auth.ts

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth for Users
    // lib/auth.ts - Find the GoogleProvider and update scopes

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/spreadsheets", // Read/write sheets
            "https://www.googleapis.com/auth/drive.file", // CHANGED from drive.readonly
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),

    // Admin Login (Credentials)
    CredentialsProvider({
      id: "admin-login",
      name: "Admin Login",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "admin@sheetcon.local",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "••••••••",
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter email and password");
        }

        const admin = await prisma.admin.findUnique({
          where: { email: credentials.email },
        });

        if (!admin) {
          throw new Error("Invalid email or password");
        }

        if (!admin.isActive) {
          throw new Error("Your account has been deactivated");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          admin.passwordHash,
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        await prisma.admin.update({
          where: { id: admin.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          type: "admin",
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google sign in
      if (account?.provider === "google") {
        try {
          const email = user.email!;

          // Check if user exists
          let dbUser = await prisma.user.findUnique({
            where: { email },
          });

          if (!dbUser) {
            // Get default free tier
            const freeTier = await prisma.tier.findUnique({
              where: { slug: "free" },
            });

            if (!freeTier) {
              console.error("Free tier not found");
              return false;
            }

            // Create new user
            dbUser = await prisma.user.create({
              data: {
                email,
                name: user.name || null,
                image: user.image || null,
                googleId: account.providerAccountId,
                accessToken: account.access_token || null,
                refreshToken: account.refresh_token || null,
                tierId: freeTier.id,
                isActive: true,
                emailVerified: true,
              },
            });

            // Increment tier user count
            await prisma.tier.update({
              where: { id: freeTier.id },
              data: { currentUserCount: { increment: 1 } },
            });
          } else {
            // Update existing user tokens
            await prisma.user.update({
              where: { id: dbUser.id },
              data: {
                accessToken: account.access_token || dbUser.accessToken,
                refreshToken: account.refresh_token || dbUser.refreshToken,
                lastLoginAt: new Date(),
              },
            });

            // Check if user is banned
            if (dbUser.isBanned) {
              return false;
            }
          }

          return true;
        } catch (error) {
          console.error("Error in signIn callback:", error);
          return false;
        }
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.type = (user as any).type || "user";
        token.role = (user as any).role;
      }

      // For Google sign in, fetch user from database
      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          include: { tier: true },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.type = "user";
          token.tierId = dbUser.tierId;
          token.tierName = dbUser.tier.name;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session.user as any).type = token.type;
        (session.user as any).role = token.role;
        (session.user as any).tierId = token.tierId;
        (session.user as any).tierName = token.tierName;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days for users
  },

  secret: process.env.NEXTAUTH_SECRET,
};
