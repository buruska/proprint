import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getAuthenticatedAdminWithPermission } from "@/lib/admin-auth";
import {
  computeHandmadeEventExpiresAt,
  getHandmadeEvents,
  serializeHandmadeEvent,
} from "@/lib/handmade-events";
import { connectToDatabase } from "@/lib/mongodb";
import { HandmadeEventModel } from "@/lib/models/handmade-event";

type CreatePayload = {
  name?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  coordinates?: unknown;
  address?: unknown;
  website?: unknown;
};

function createUnauthorizedResponse(status: "unauthenticated" | "forbidden") {
  if (status === "unauthenticated") {
    return NextResponse.json(
      { message: "A művelethez be kell jelentkezned." },
      { status: 401 },
    );
  }

  return NextResponse.json(
    { message: "Nincs jogosultságod a handmade rendezvények kezeléséhez." },
    { status: 403 },
  );
}

function isValidDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET() {
  const access = await getAuthenticatedAdminWithPermission("handmade");

  if (access.status !== "ok") {
    return createUnauthorizedResponse(access.status);
  }

  const events = await getHandmadeEvents();

  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const access = await getAuthenticatedAdminWithPermission("handmade");

  if (access.status !== "ok") {
    return createUnauthorizedResponse(access.status);
  }

  const payload = (await request.json().catch(() => null)) as CreatePayload | null;

  if (!payload) {
    return NextResponse.json(
      { message: "A kérés adatai nem értelmezhetők." },
      { status: 400 },
    );
  }

  if (typeof payload.name !== "string" || !payload.name.trim()) {
    return NextResponse.json(
      { message: "Add meg a rendezvény nevét." },
      { status: 400 },
    );
  }

  if (typeof payload.startDate !== "string" || !payload.startDate.trim()) {
    return NextResponse.json(
      { message: "Add meg a kezdő dátumot." },
      { status: 400 },
    );
  }

  if (typeof payload.endDate !== "string" || !payload.endDate.trim()) {
    return NextResponse.json(
      { message: "Add meg a záró dátumot." },
      { status: 400 },
    );
  }

  if (!isValidDateInput(payload.startDate.trim()) || !isValidDateInput(payload.endDate.trim())) {
    return NextResponse.json(
      { message: "A dátum formátuma érvénytelen." },
      { status: 400 },
    );
  }

  if (typeof payload.coordinates !== "string" || !payload.coordinates.trim()) {
    return NextResponse.json(
      { message: "Jelöld ki a rendezvény helyét a térképen." },
      { status: 400 },
    );
  }

  if (typeof payload.address !== "string" || !payload.address.trim()) {
    return NextResponse.json(
      { message: "Add meg a rendezvény címét." },
      { status: 400 },
    );
  }

  if (payload.website !== undefined && payload.website !== null && typeof payload.website !== "string") {
    return NextResponse.json(
      { message: "A weboldal mező értéke érvénytelen." },
      { status: 400 },
    );
  }

  const trimmedWebsite = typeof payload.website === "string" ? payload.website.trim() : "";

  if (trimmedWebsite && !isValidUrl(trimmedWebsite)) {
    return NextResponse.json(
      { message: "A weboldal címe csak teljes http vagy https link lehet." },
      { status: 400 },
    );
  }

  const startDate = new Date(`${payload.startDate.trim()}T00:00:00.000Z`);
  const endDate = new Date(`${payload.endDate.trim()}T00:00:00.000Z`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json(
      { message: "A kiválasztott dátum nem érvényes." },
      { status: 400 },
    );
  }

  if (startDate > endDate) {
    return NextResponse.json(
      { message: "A záró dátum nem lehet korábbi, mint a kezdő dátum." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const createdEvent = await HandmadeEventModel.create({
    name: payload.name.trim(),
    startDate,
    endDate,
    expiresAt: computeHandmadeEventExpiresAt(endDate),
    coordinates: payload.coordinates.trim(),
    address: payload.address.trim(),
    website: trimmedWebsite,
  });

  revalidatePath("/handmade");
  revalidatePath("/admin/handmade");

  return NextResponse.json(
    {
      message: "A rendezvény mentése sikerült.",
      event: serializeHandmadeEvent(createdEvent.toObject()),
    },
    { status: 201 },
  );
}
