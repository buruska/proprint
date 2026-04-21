import { withAuth } from "next-auth/middleware";

import {
  getAdminPermissionForPath,
  hasAdminPermission,
} from "@/lib/admin-permissions";

export default withAuth({
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    authorized: ({ req, token }) => {
      if (!(token?.role === "superadmin" || token?.role === "editor" || Array.isArray(token?.role))) {
        return false;
      }

      const pathname = req.nextUrl.pathname;
      const permission = getAdminPermissionForPath(pathname);

      if (!permission) {
        return true;
      }

      return hasAdminPermission(
        {
          role: token.role,
          permissions: token.permissions,
        },
        permission,
      );
    },
  },
});

export const config = {
  matcher: [
    "/admin",
    "/admin/about",
    "/admin/admins",
    "/admin/books",
    "/admin/books/:path*",
    "/admin/contact",
    "/admin/content",
    "/admin/ebooks",
    "/admin/handmade",
    "/admin/orders",
    "/admin/profile",
    "/admin/rendezvenyek",
    "/admin/services",
  ],
};
