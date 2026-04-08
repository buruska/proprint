import type { Metadata } from "next";

import { AdminAboutEditor } from "@/app/_components/admin-about-editor";
import { getAboutPageContent } from "@/lib/about-content";

export const metadata: Metadata = {
  title: "Kiadóról",
};

export default async function AdminAboutPage() {
  const content = await getAboutPageContent();

  return <AdminAboutEditor initialContent={content} />;
}
