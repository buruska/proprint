import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { normalizeAdminRole } from "@/lib/admin-permissions";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminUserModel } from "@/lib/models/admin-user";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        await connectToDatabase();

        const admin = await AdminUserModel.findOne({
          email: credentials.email.trim().toLowerCase(),
          isActive: true,
        }).lean();

        if (!admin) {
          return null;
        }

        const passwordMatches = await compare(
          credentials.password,
          admin.passwordHash,
        );

        if (!passwordMatches) {
          return null;
        }

        return {
          id: admin._id.toString(),
          email: admin.email,
          role: normalizeAdminRole(admin.role, admin.permissions),
          isProtected: admin.isProtected,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.permissions = Array.isArray(user.role) ? user.role : [];
        token.isProtected = user.isProtected;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = normalizeAdminRole(token.role, token.permissions);
        session.user.isProtected = Boolean(token.isProtected);
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
