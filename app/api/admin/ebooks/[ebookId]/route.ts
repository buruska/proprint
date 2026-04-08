import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAuthenticatedAdminWithPermission } from "@/lib/admin-auth";
import mongoose from "mongoose";

import { EBOOK_STATUS_VALUES, type EbookStatus } from "@/lib/ebook-status";
import { connectToDatabase } from "@/lib/mongodb";
import { EbookModel } from "@/lib/models/ebook";

type PatchPayload = {
  title?: unknown;
  author?: unknown;
  coverImageUrl?: unknown;
  pdfUrl?: unknown;
  epubUrl?: unknown;
  mobiUrl?: unknown;
  status?: unknown;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ ebookId: string }> },
) {
  const access = await getAuthenticatedAdminWithPermission("ebooks");

  if (access.status === "unauthenticated") {
    return NextResponse.json(
      { message: "A művelethez be kell jelentkezned." },
      { status: 401 },
    );
  }

  if (access.status === "forbidden") {
    return NextResponse.json(
      { message: "Nincs jogosultságod az e-könyvek kezeléséhez." },
      { status: 403 },
    );
  }

  const { ebookId } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(ebookId)) {
    return NextResponse.json(
      { message: "Érvénytelen e-könyvazonosító." },
      { status: 400 },
    );
  }

  const payload = (await request.json().catch(() => null)) as PatchPayload | null;

  if (!payload) {
    return NextResponse.json(
      { message: "A kérés törzse nem értelmezhető." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const currentEbook = await EbookModel.findById(ebookId).lean();

  if (!currentEbook) {
    return NextResponse.json(
      { message: "Az e-könyv nem található." },
      { status: 404 },
    );
  }

  const updates: Record<string, unknown> = {};

  if ("title" in payload) {
    if (typeof payload.title !== "string" || !payload.title.trim()) {
      return NextResponse.json(
        { message: "Az e-könyv címe kötelező." },
        { status: 400 },
      );
    }

    updates.title = payload.title.trim();
  }

  if ("author" in payload) {
    if (typeof payload.author !== "string") {
      return NextResponse.json(
        { message: "A szerző mező értéke érvénytelen." },
        { status: 400 },
      );
    }

    updates.author = payload.author.trim();
  }

  if ("coverImageUrl" in payload) {
    if (typeof payload.coverImageUrl !== "string" || !payload.coverImageUrl.trim()) {
      return NextResponse.json(
        { message: "A borítókép feltöltése kötelező." },
        { status: 400 },
      );
    }

    updates.coverImageUrl = payload.coverImageUrl.trim();
  }

  if ("pdfUrl" in payload) {
    if (typeof payload.pdfUrl !== "string") {
      return NextResponse.json(
        { message: "A PDF mező értéke érvénytelen." },
        { status: 400 },
      );
    }

    updates.pdfUrl = payload.pdfUrl.trim();
  }

  if ("epubUrl" in payload) {
    if (typeof payload.epubUrl !== "string") {
      return NextResponse.json(
        { message: "Az EPUB mező értéke érvénytelen." },
        { status: 400 },
      );
    }

    updates.epubUrl = payload.epubUrl.trim();
  }

  if ("mobiUrl" in payload) {
    if (typeof payload.mobiUrl !== "string") {
      return NextResponse.json(
        { message: "A MOBI mező értéke érvénytelen." },
        { status: 400 },
      );
    }

    updates.mobiUrl = payload.mobiUrl.trim();
  }

  if ("status" in payload) {
    if (
      typeof payload.status !== "string" ||
      !EBOOK_STATUS_VALUES.includes(payload.status as EbookStatus)
    ) {
      return NextResponse.json(
        { message: "A státusz csak vázlat vagy publikált lehet." },
        { status: 400 },
      );
    }

    updates.status = payload.status;
  }

  const nextPdfUrl = typeof updates.pdfUrl === "string" ? updates.pdfUrl : currentEbook.pdfUrl ?? "";
  const nextEpubUrl = typeof updates.epubUrl === "string" ? updates.epubUrl : currentEbook.epubUrl ?? "";
  const nextMobiUrl = typeof updates.mobiUrl === "string" ? updates.mobiUrl : currentEbook.mobiUrl ?? "";

  if (!nextPdfUrl && !nextEpubUrl && !nextMobiUrl) {
    return NextResponse.json(
      { message: "A PDF, EPUB és MOBI fájlok közül legalább egy feltöltése kötelező." },
      { status: 400 },
    );
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { message: "Nincs menthető módosítás a kérésben." },
      { status: 400 },
    );
  }

  const updatedEbook = await EbookModel.findByIdAndUpdate(
    ebookId,
    {
      $set: updates,
    },
    {
      returnDocument: "after",
    },
  ).lean();

  if (!updatedEbook) {
    return NextResponse.json(
      { message: "Az e-könyv nem található." },
      { status: 404 },
    );
  }

  revalidatePath("/admin/ebooks");
  revalidatePath("/books");

  return NextResponse.json({
    message: "Az e-könyv adatai sikeresen frissültek.",
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ ebookId: string }> },
) {
  const access = await getAuthenticatedAdminWithPermission("ebooks");

  if (access.status === "unauthenticated") {
    return NextResponse.json(
      { message: "A művelethez be kell jelentkezned." },
      { status: 401 },
    );
  }

  if (access.status === "forbidden") {
    return NextResponse.json(
      { message: "Nincs jogosultságod az e-könyvek kezeléséhez." },
      { status: 403 },
    );
  }

  const { ebookId } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(ebookId)) {
    return NextResponse.json(
      { message: "Érvénytelen e-könyvazonosító." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const deletedEbook = await EbookModel.findByIdAndDelete(ebookId).lean();

  if (!deletedEbook) {
    return NextResponse.json(
      { message: "Az e-könyv nem található." },
      { status: 404 },
    );
  }

  revalidatePath("/admin/ebooks");
  revalidatePath("/books");

  return NextResponse.json({
    message: "Az e-könyv sikeresen törölve lett.",
  });
}
