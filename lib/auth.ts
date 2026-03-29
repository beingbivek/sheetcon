// lib/auth.ts

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  
  providers: [
    CredentialsProvider({
      id: 'admin-login',
      name: 'Admin Login',
      credentials: {
        email: { 
          label: 'Email', 
          type: 'email',
          placeholder: 'admin@sheetcon.local'
        },
        password: { 
          label: 'Password', 
          type: 'password',
          placeholder: '••••••••'
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter email and password');
        }

        const admin = await prisma.admin.findUnique({
          where: { email: credentials.email },
        });

        if (!admin) {
          throw new Error('Invalid email or password');
        }

        if (!admin.isActive) {
          throw new Error('Your account has been deactivated');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          admin.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        await prisma.admin.update({
          where: { id: admin.id },
          data: { 
            lastLogin: new Date(),
          },
        });

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as any).role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },

  pages: {
    signIn: '/admin-login',  // ← CHANGED THIS
    error: '/admin-login',   // ← CHANGED THIS
  },

  session: {
    strategy: 'jwt',
    maxAge: 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
};