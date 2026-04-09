import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getAuthenticatedAdminWithPermission } from "@/lib/admin-auth";
import {
  SERVICES_PAGE_SLUG,
  getServicesPageContent,
  sanitizeServicesPageInput,
} from "@/lib/services-content";
import { connectToDatabase } from "@/lib/mongodb";
import { ServicesPageModel } from "@/lib/models/services-page";

type UpdatePayload = {
  cards?: unknown;
};

function createUnauthorizedResponse(status: "unauthenticated" | "forbidden") {
  if (status === "unauthenticated") {
    return NextResponse.json(
      { message: "A művelethez be kell jelentkezned." },
      { status: 401 },
    );
  }

  return NextResponse.json(
    { message: "Nincs jogosultságod a szolgáltatások szerkesztéséhez." },
    { status: 403 },
  );
}

export async function GET() {
  const access = await getAuthenticatedAdminWithPermission("services");

  if (access.status !== "ok") {
    return createUnauthorizedResponse(access.status);
  }

  const content = await getServicesPageContent();

  return NextResponse.json({ content });
}

export async function PUT(request: Request) {
  const access = await getAuthenticatedAdminWithPermission("services");

  if (access.status !== "ok") {
    return createUnauthorizedResponse(access.status);
  }

  const payload = (await request.json().catch(() => null)) as UpdatePayload | null;

  if (!payload || !Array.isArray(payload.cards)) {
    return NextResponse.json(
      { message: "A mentéshez hiányoznak a szolgáltatás-kártyák adatai." },
      { status: 400 },
    );
  }

  const cards = sanitizeServicesPageInput(payload.cards);

  if (cards.length === 0) {
    return NextResponse.json(
      { message: "Legalább egy szolgáltatás-kártya szükséges." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const updatedPage = await ServicesPageModel.findOneAndUpdate(
    { slug: SERVICES_PAGE_SLUG },
    {
      $set: {
        slug: SERVICES_PAGE_SLUG,
        cards,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  revalidatePath("/services");
  revalidatePath("/admin/services");

  return NextResponse.json({
    message: "A szolgáltatás-kártyák sikeresen mentve lettek.",
    content: {
      cards,
      updatedAt:
        updatedPage?.updatedAt instanceof Date
          ? updatedPage.updatedAt.toISOString()
          : typeof updatedPage?.updatedAt === "string"
            ? new Date(updatedPage.updatedAt).toISOString()
            : null,
    },
  });
}
