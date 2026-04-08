import type { Metadata } from "next";

import { AdminContentManager } from "@/app/_components/admin-content-manager";
import { adminContentBlocks } from "@/lib/data";

export const metadata: Metadata = {
  title: "Tartalmak",
};

export default function AdminContentPage() {
  return <AdminContentManager blocks={adminContentBlocks} />;
}
