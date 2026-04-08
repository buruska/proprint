import type { DefaultSession } from "next-auth";

import type { AdminPermission, AdminRole } from "@/lib/admin-permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AdminRole;
      isProtected: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: AdminRole;
    isProtected: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AdminRole | "editor";
    permissions?: AdminPermission[];
    isProtected?: boolean;
  }
}
