import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { getDefaultAdminPath } from "@/lib/admin-permissions";

export const metadata: Metadata = {
  title: "Vezérlőpult",
};

export default async function AdminPage() {
  const admin = await getAuthenticatedAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  redirect(getDefaultAdminPath(admin));
}
