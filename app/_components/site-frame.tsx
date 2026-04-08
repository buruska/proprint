"use client";

import type { ReactNode } from "react";

import { usePathname } from "next/navigation";

import { SiteFooter } from "@/app/_components/site-footer";
import { SiteHeader } from "@/app/_components/site-header";

type SiteFrameProps = {
  children: ReactNode;
};

export function SiteFrame({ children }: SiteFrameProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <div className="page-frame">
      <SiteHeader />
      <main style={isAdminRoute ? { paddingBottom: 24 } : undefined}>{children}</main>
      {isAdminRoute ? null : <SiteFooter />}
    </div>
  );
}
