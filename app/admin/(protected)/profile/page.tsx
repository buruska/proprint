import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AdminProfileManager } from "@/app/_components/admin-profile-manager";
import { authOptions } from "@/lib/auth-options";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminUserModel } from "@/lib/models/admin-user";

export const metadata: Metadata = {
  title: "Saját adatok",
};

export default async function AdminProfilePage() {
  const session = await getServerSession(authOptions);
  const normalizedEmail = session?.user?.email?.trim().toLowerCase();

  if (!normalizedEmail) {
    redirect("/admin/login");
  }

  await connectToDatabase();

  const admin = await AdminUserModel.findOne({
    email: normalizedEmail,
    isActive: true,
  }).lean();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <AdminProfileManager
      email={admin.email}
      firstName={admin.firstName ?? ""}
      lastName={admin.lastName ?? ""}
    />
  );
}
