import type { Metadata } from "next";

import { AdminHandmadePageEditor } from "@/app/_components/admin-handmade-page-editor";
import { getHandmadePageContent } from "@/lib/handmade-content";

export const metadata: Metadata = {
  title: "Handmade",
};

export default async function AdminHandmadePage() {
  const content = await getHandmadePageContent();

  return <AdminHandmadePageEditor initialContent={content} />;
}
