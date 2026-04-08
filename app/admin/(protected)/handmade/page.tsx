import type { Metadata } from "next";

import { AdminHandmadeEventsManager } from "@/app/_components/admin-handmade-events-manager";
import { getHandmadeEvents } from "@/lib/handmade-events";

export const metadata: Metadata = {
  title: "Handmade",
};

export default async function AdminHandmadePage() {
  const events = await getHandmadeEvents();

  return <AdminHandmadeEventsManager initialEvents={events} />;
}
