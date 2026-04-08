import type { Metadata } from "next";

import { ServicesClient } from "./services-client";
import { getServicesPageContent } from "@/lib/services-content";

export const metadata: Metadata = {
  title: "Szolgáltatásaink",
};

export default async function ServicesPage() {
  const content = await getServicesPageContent();

  return <ServicesClient cards={content.cards} />;
}
