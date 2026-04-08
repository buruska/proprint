import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  ABOUT_PAGE_SLUG,
  getAboutPageContent,
  sanitizeAboutPageInput,
} from "@/lib/about-content";
import { getAuthenticatedAdminWithPermission } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { PageContentModel } from "@/lib/models/page-content";
import type { EditablePageContent } from "@/lib/rich-page-content";

type UpdatePayload = {
  eyebrow?: unknown;
  title?: unknown;
  description?: unknown;
  bodyHtml?: unknown;
};

function createUnauthorizedResponse(status: "unauthenticated" | "forbidden") {
  if (status === "unauthenticated") {
    return NextResponse.json(
      { message: "A művelethez be kell jelentkezned." },
      { status: 401 },
    );
  }

  return NextResponse.json(
    { message: "Nincs jogosultságod a Kiadóról oldal szerkesztéséhez." },
    { status: 403 },
  );
}

function isEditablePageContentPayload(value: UpdatePayload | null): value is EditablePageContent {
  return Boolean(
    value &&
      typeof value.eyebrow === "string" &&
      typeof value.title === "string" &&
      typeof value.description === "string" &&
      typeof value.bodyHtml === "string",
  );
}

export async function GET() {
  const access = await getAuthenticatedAdminWithPermission("about");

  if (access.status !== "ok") {
    return createUnauthorizedResponse(access.status);
  }

  const content = await getAboutPageContent();

  return NextResponse.json({ content });
}

export async function PUT(request: Request) {
  const access = await getAuthenticatedAdminWithPermission("about");

  if (access.status !== "ok") {
    return createUnauthorizedResponse(access.status);
  }

  const payload = (await request.json().catch(() => null)) as UpdatePayload | null;

  if (!isEditablePageContentPayload(payload)) {
    return NextResponse.json(
      { message: "A mentéshez hiányos vagy érvénytelen tartalom érkezett." },
      { status: 400 },
    );
  }

  const content = sanitizeAboutPageInput(payload);

  await connectToDatabase();

  const updatedPage = await PageContentModel.findOneAndUpdate(
    { slug: ABOUT_PAGE_SLUG },
    {
      $set: {
        slug: ABOUT_PAGE_SLUG,
        eyebrow: content.eyebrow,
        title: content.title,
        description: content.description,
        bodyHtml: content.bodyHtml,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  revalidatePath("/about");
  revalidatePath("/admin/about");

  return NextResponse.json({
    message: "A Kiadóról oldal tartalma sikeresen mentve lett.",
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
