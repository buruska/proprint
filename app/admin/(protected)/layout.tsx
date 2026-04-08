import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { AdminShell } from "@/app/_components/admin-shell";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await getAuthenticatedAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <section className="section admin-section">
      <div className="shell">
        <AdminShell firstName={admin.firstName ?? ""} role={admin.role}>
          {children}
        </AdminShell>
      </div>
    </section>
  );
}
