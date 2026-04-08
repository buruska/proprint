import "server-only";

import { connectToDatabase } from "@/lib/mongodb";
import { HandmadeEventModel } from "@/lib/models/handmade-event";

export type HandmadeEventListItem = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  coordinates: string;
  address: string;
  website: string;
};

export function computeHandmadeEventExpiresAt(endDate: Date) {
  const expiresAt = new Date(endDate);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 1);
  return expiresAt;
}

export async function cleanupExpiredHandmadeEvents() {
  await connectToDatabase();

  const now = new Date();
  const startOfTodayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  await HandmadeEventModel.deleteMany({
    $or: [
      { expiresAt: { $lte: now } },
      {
        expiresAt: { $exists: false },
        endDate: { $lt: startOfTodayUtc },
      },
    ],
  });
}

export function serializeHandmadeEvent(event: {
  _id: { toString(): string } | string;
  name?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  coordinates?: string;
  address?: string;
  website?: string;
}): HandmadeEventListItem {
  return {
    id: typeof event._id === "string" ? event._id : event._id.toString(),
    name: event.name?.trim() || "Névtelen rendezvény",
    startDate: event.startDate
      ? new Date(event.startDate).toISOString().slice(0, 10)
      : "",
    endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 10) : "",
    coordinates: event.coordinates?.trim() || "",
    address: event.address?.trim() || "",
    website: event.website?.trim() || "",
  };
}

function sortHandmadeEvents(items: HandmadeEventListItem[]) {
  return [...items].sort((left, right) => {
    const startDateComparison = left.startDate.localeCompare(right.startDate, "hu-HU");

    if (startDateComparison !== 0) {
      return startDateComparison;
    }

    const endDateComparison = left.endDate.localeCompare(right.endDate, "hu-HU");

    if (endDateComparison !== 0) {
      return endDateComparison;
    }

    return left.name.localeCompare(right.name, "hu-HU", {
      sensitivity: "base",
    });
  });
}

export async function getHandmadeEvents(): Promise<HandmadeEventListItem[]> {
  await cleanupExpiredHandmadeEvents();

  const events = await HandmadeEventModel.find({}).lean();

  return sortHandmadeEvents(events.map((event) => serializeHandmadeEvent(event)));
}
