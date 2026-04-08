import type { Metadata } from "next";

import { AdminServicesManager } from "@/app/_components/admin-services-manager";
import { getServicesPageContent } from "@/lib/services-content";

export const metadata: Metadata = {
  title: "Szolgáltatások",
};

export default async function AdminServicesPage() {
  const content = await getServicesPageContent();

  return <AdminServicesManager initialContent={content} />;
}
