import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";
import {
  getAdminPermissions,
  hasAdminPermission,
  normalizeAdminRole,
  type AdminPermission,
} from "@/lib/admin-permissions";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminUserModel } from "@/lib/models/admin-user";

export async function getAuthenticatedAdmin() {
  const session = await getServerSession(authOptions);
  const normalizedEmail = session?.user?.email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  await connectToDatabase();

  const admin = await AdminUserModel.findOne({
    email: normalizedEmail,
    isActive: true,
  }).lean();

  if (!admin) {
    return null;
  }

  const role = normalizeAdminRole(admin.role, admin.permissions);

  return {
    ...admin,
    role,
    permissions: getAdminPermissions({ role }),
  };
}

export async function getAuthenticatedAdminWithPermission(
  permission?: AdminPermission,
) {
  const admin = await getAuthenticatedAdmin();

  if (!admin) {
    return { status: "unauthenticated" as const };
  }

  if (permission && !hasAdminPermission(admin, permission)) {
    return { status: "forbidden" as const, admin };
  }

  return { status: "ok" as const, admin };
}
