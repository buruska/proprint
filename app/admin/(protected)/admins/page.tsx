import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminInvitesManager } from "@/app/_components/admin-invites-manager";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import {
  ADMIN_PERMISSION_LABELS,
  normalizeAdminRole,
} from "@/lib/admin-permissions";
import { AdminUserModel } from "@/lib/models/admin-user";

export const metadata: Metadata = {
  title: "Adminok",
};

export default async function AdminAdminsPage() {
  const currentAdmin = await getAuthenticatedAdmin();

  if (!currentAdmin) {
    redirect("/admin/login");
  }

  const admins = await AdminUserModel.find({ isActive: true })
    .select("firstName lastName email role permissions isProtected")
    .sort({ isProtected: -1, lastName: 1, firstName: 1, email: 1 })
    .lean();

  const items = admins.flatMap((admin) => {
    const normalizedRole = normalizeAdminRole(admin.role, admin.permissions);
    const isCurrentAdmin = admin._id.toString() === currentAdmin._id.toString();

    if (normalizedRole === "superadmin" && !isCurrentAdmin) {
      return [];
    }

    const permissions =
      normalizedRole === "superadmin"
        ? []
        : normalizedRole.map((permission) => ADMIN_PERMISSION_LABELS[permission]);
    const fullName = [admin.lastName?.trim(), admin.firstName?.trim()]
      .filter(Boolean)
      .join(" ");

    return [
      {
        id: admin._id.toString(),
        name: fullName || "Név nélkül",
        email: admin.email,
        roleLabel: normalizedRole === "superadmin" ? "Szuperadmin" : null,
        isProtected: Boolean(admin.isProtected),
        permissions,
        canDelete: !admin.isProtected && !isCurrentAdmin,
      },
    ];
  });

  return (
    <AdminInvitesManager
      admins={items}
      currentAdminId={currentAdmin._id.toString()}
    />
  );
}

