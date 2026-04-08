import type { Metadata } from "next";

import { AdminPlaceholderPage } from "@/app/_components/admin-placeholder-page";

export const metadata: Metadata = {
  title: "Kapcsolat",
};

export default function AdminContactPage() {
  return (
    <AdminPlaceholderPage
      eyebrow="Kapcsolat"
      title="Kapcsolat"
      description="Ezen az oldalon lesz majd kezelhető a kapcsolat oldal tartalma, az elérhetőségek és az üzenetküldési információk."
    />
  );
}
