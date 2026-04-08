"use client";

import { signOut } from "next-auth/react";

export function AdminLogoutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
    >
      Kijelentkezés
    </button>
  );
}
