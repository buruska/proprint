"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AdminLogoutButton } from "@/app/_components/admin-logout-button";
import { AdminSessionTimer } from "@/app/_components/admin-session-timer";
import {
  getAccessibleAdminLinks,
  type AdminRole,
} from "@/lib/admin-permissions";

import styles from "./admin-shell.module.css";

export function AdminShell({
  children,
  firstName,
  role,
}: {
  children: ReactNode;
  firstName?: string;
  role: AdminRole;
}) {
  const pathname = usePathname();
  const greeting = firstName?.trim() ? `Szia, ${firstName}!` : "Szia!";
  const adminLinks = getAccessibleAdminLinks({ role });

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className={styles.sidebarHeader}>
          <p className="eyebrow">Vezérlőpult</p>
          <h2 className={styles.sidebarTitle}>{greeting}</h2>
          <AdminSessionTimer />
        </div>

        <nav className={styles.menu} aria-label="Admin navigáció">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.menuItem} ${pathname === link.href ? styles.menuItemActive : ""}`}
            >
              {link.label}
            </Link>
          ))}

          <AdminLogoutButton className={`${styles.menuItem} ${styles.logoutItem}`} />
        </nav>
      </aside>

      <section className="admin-content">{children}</section>
    </div>
  );
}
