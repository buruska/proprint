import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { getAuthenticatedAdminWithPermission } from "@/lib/admin-auth";
import {
  computeHandmadeEventExpiresAt,
  serializeHandmadeEvent,
} from "@/lib/handmade-events";
import { connectToDatabase } from "@/lib/mongodb";
import { HandmadeEventModel } from "@/lib/models/handmade-event";

type UpdatePayload = {
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

function getEventIdFromParams(params: { eventId: string }) {
  if (!mongoose.Types.ObjectId.isValid(params.eventId)) {
    return null;
  }

  return new mongoose.Types.ObjectId(params.eventId);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const access = await getAuthenticatedAdminWithPermission("handmade");

  if (access.status !== "ok") {
    return createUnauthorizedResponse(access.status);
  }

  const resolvedParams = await params;
  const eventId = getEventIdFromParams(resolvedParams);

  if (!eventId) {
    return NextResponse.json(
      { message: "A rendezvény azonosítója érvénytelen." },
      { status: 400 },
    );
  }

  const payload = (await request.json().catch(() => null)) as UpdatePayload | null;

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

  const updatedEvent = await HandmadeEventModel.findByIdAndUpdate(
    eventId,
    {
      $set: {
        name: payload.name.trim(),
        startDate,
        endDate,
        expiresAt: computeHandmadeEventExpiresAt(endDate),
        coordinates: payload.coordinates.trim(),
        address: payload.address.trim(),
        website: trimmedWebsite,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

  if (!updatedEvent) {
    return NextResponse.json(
      { message: "A rendezvény nem található." },
      { status: 404 },
    );
  }

  revalidatePath("/handmade");
  revalidatePath("/admin/handmade");

  return NextResponse.json({
    message: "A rendezvény adatai frissültek.",
    event: serializeHandmadeEvent(updatedEvent),
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const access = await getAuthenticatedAdminWithPermission("handmade");

  if (access.status !== "ok") {
    return createUnauthorizedResponse(access.status);
  }

  const resolvedParams = await params;
  const eventId = getEventIdFromParams(resolvedParams);

  if (!eventId) {
    return NextResponse.json(
      { message: "A rendezvény azonosítója érvénytelen." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const deletedEvent = await HandmadeEventModel.findByIdAndDelete(eventId).lean();

  if (!deletedEvent) {
    return NextResponse.json(
      { message: "A rendezvény nem található." },
      { status: 404 },
    );
  }

  revalidatePath("/handmade");
  revalidatePath("/admin/handmade");

  return NextResponse.json({
    message: "A rendezvény törölve lett.",
  });
}
