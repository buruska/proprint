import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Admin - Pro-Print Könyvkiadó",
    template: "%s - Pro-Print Könyvkiadó",
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="admin-route-layout">{children}</div>;
}
