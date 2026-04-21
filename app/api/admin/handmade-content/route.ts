import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  getHandmadePageContent,
  HANDMADE_PAGE_SLUG,
  sanitizeHandmadePageInput,
} from "@/lib/handmade-content";
import { getAuthenticatedAdminWithPermission } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { PageContentModel } from "@/lib/models/page-content";

function createUnauthorizedResponse(status: "unauthenticated" | "forbidden") {
  if (status === "unauthenticated") {
    return NextResponse.json(
      { message: "A művelethez be kell jelentkezned." },
      { status: 401 },
    );
  }

  return NextResponse.json(
    { message: "Nincs jogosultságod a Handmade oldal szerkesztéséhez." },
    { status: 403 },
  );
}

function isPayload(
  value: { leadText?: unknown; galleryImageUrls?: unknown } | null,
): value is { leadText: string; galleryImageUrls: unknown } {
  return Boolean(
    value &&
      typeof value.leadText === "string" &&
      Array.isArray(value.galleryImageUrls),
  );
}

export async function GET() {
  const access = await getAuthenticatedAdminWithPermission("handmade");

  if (access.status !== "ok") {
    return createUnauthorizedResponse(access.status);
  }

  const content = await getHandmadePageContent();

  return NextResponse.json({ content });
}

export async function PUT(request: Request) {
  const access = await getAuthenticatedAdminWithPermission("handmade");

  if (access.status !== "ok") {
    return createUnauthorizedResponse(access.status);
  }

  const payload = (await request.json().catch(() => null)) as
    | { leadText?: unknown; galleryImageUrls?: unknown }
    | null;

  if (!isPayload(payload)) {
    return NextResponse.json(
      { message: "A mentéshez hiányos vagy érvénytelen tartalom érkezett." },
      { status: 400 },
    );
  }

  const content = sanitizeHandmadePageInput(payload);

  await connectToDatabase();

  const updatedPage = await PageContentModel.findOneAndUpdate(
    { slug: HANDMADE_PAGE_SLUG },
    {
      $set: {
        slug: HANDMADE_PAGE_SLUG,
        bodyHtml: content.leadText,
        galleryImageUrls: content.galleryImageUrls,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  revalidatePath("/handmade");
  revalidatePath("/admin/handmade");

  return NextResponse.json({
    message: "A Handmade oldal tartalma sikeresen mentve lett.",
    content: {
      ...content,
      updatedAt:
        updatedPage?.updatedAt instanceof Date
          ? updatedPage.updatedAt.toISOString()
          : typeof updatedPage?.updatedAt === "string"
            ? new Date(updatedPage.updatedAt).toISOString()
            : null,
    },
  });
}
