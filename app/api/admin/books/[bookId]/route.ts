import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAuthenticatedAdminWithPermission } from "@/lib/admin-auth";
import mongoose from "mongoose";

import { BOOK_STATUS_VALUES, type BookStatus } from "@/lib/book-status";
import { normalizeBookLanguage } from "@/lib/book-language";
import { formatBookIsbn } from "@/lib/book-isbn";
import { getBookSizeDimensions, normalizeBookSizeValue } from "@/lib/book-size";

import { connectToDatabase } from "@/lib/mongodb";
import { BookModel } from "@/lib/models/book";
import { normalizeRichTextToPlainText } from "@/lib/utils";

type PatchPayload = {
  status?: unknown;
  title?: unknown;
  author?: unknown;
  language?: unknown;
  description?: unknown;
  publicationDate?: unknown;
  isbn?: unknown;
  pageCount?: unknown;
  keywords?: unknown;
  size?: unknown;
  price?: unknown;
  coverImageUrl?: unknown;
};

function isNonNegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isNonNegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isValidDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  const access = await getAuthenticatedAdminWithPermission("books");

  if (access.status === "unauthenticated") {
    return NextResponse.json(
      { message: "A művelethez be kell jelentkezned." },
      { status: 401 },
    );
  }

  if (access.status === "forbidden") {
    return NextResponse.json(
      { message: "Nincs jogosultságod a könyvek kezeléséhez." },
      { status: 403 },
    );
  }

  const { bookId } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return NextResponse.json(
      { message: "Érvénytelen könyvazonosító." },
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

  const updates: Record<string, unknown> = {};

  if ("status" in payload) {
    if (
      typeof payload.status !== "string" ||
      !BOOK_STATUS_VALUES.includes(payload.status as BookStatus)
    ) {
      return NextResponse.json(
        { message: "Érvénytelen státuszérték." },
        { status: 400 },
      );
    }

    updates.status = payload.status;
  }

  if ("title" in payload) {
    if (typeof payload.title !== "string" || !payload.title.trim()) {
      return NextResponse.json(
        { message: "A könyv címe kötelező." },
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

  if ("language" in payload) {
    if (typeof payload.language !== "string") {
      return NextResponse.json(
        { message: "A nyelv mező értéke érvénytelen." },
        { status: 400 },
      );
    }

    const normalizedLanguage = normalizeBookLanguage(payload.language);

    if (!normalizedLanguage) {
      return NextResponse.json(
        { message: "A nyelv csak magyar, román, angol vagy német lehet." },
        { status: 400 },
      );
    }

    updates.language = normalizedLanguage;
  }

  if ("description" in payload) {
    if (typeof payload.description !== "string") {
      return NextResponse.json(
        { message: "A leírás mező értéke érvénytelen." },
        { status: 400 },
      );
    }

    updates.description = normalizeRichTextToPlainText(payload.description);
  }

  if ("publicationDate" in payload) {
    if (payload.publicationDate !== null && typeof payload.publicationDate !== "string") {
      return NextResponse.json(
        { message: "A kiadási dátum formátuma érvénytelen." },
        { status: 400 },
      );
    }

    if (payload.publicationDate === null || !payload.publicationDate.trim()) {
      updates.publicationDate = null;
      updates.publicationYear = null;
    } else {
      const normalizedDate = payload.publicationDate.trim();

      if (!isValidDateInput(normalizedDate)) {
        return NextResponse.json(
          { message: "A kiadási dátum formátuma érvénytelen." },
          { status: 400 },
        );
      }

      updates.publicationDate = new Date(`${normalizedDate}T00:00:00.000Z`);
      updates.publicationYear = Number(normalizedDate.slice(0, 4));
    }
  }

  if ("isbn" in payload) {
    if (typeof payload.isbn !== "string") {
      return NextResponse.json(
        { message: "Az ISBN mező értéke érvénytelen." },
        { status: 400 },
      );
    }

    updates.isbn = formatBookIsbn(payload.isbn);
  }

  if ("pageCount" in payload) {
    if (payload.pageCount !== null && !isNonNegativeInteger(payload.pageCount)) {
      return NextResponse.json(
        { message: "Az oldalszám csak nem negatív egész szám lehet." },
        { status: 400 },
      );
    }

    updates.pageCount = payload.pageCount;
  }

  if ("keywords" in payload) {
    if (
      !Array.isArray(payload.keywords) ||
      payload.keywords.some((keyword) => typeof keyword !== "string")
    ) {
      return NextResponse.json(
        { message: "A kulcsszavak formátuma érvénytelen." },
        { status: 400 },
      );
    }

    updates.keywords = payload.keywords
      .map((keyword) => keyword.trim())
      .filter(Boolean);
  }

  if ("size" in payload) {
    if (typeof payload.size !== "string") {
      return NextResponse.json(
        { message: "A méret mező értéke érvénytelen." },
        { status: 400 },
      );
    }

    const normalizedSize = normalizeBookSizeValue(payload.size);

    if (payload.size.trim() && !normalizedSize) {
      return NextResponse.json(
        { message: "A méret csak A4, A5, A6, B5, B6 vagy egyedi szélesség x magasság cm lehet." },
        { status: 400 },
      );
    }

    updates.size = normalizedSize;

    const { widthCm, heightCm } = getBookSizeDimensions(normalizedSize);
    updates.widthCm = widthCm;
    updates.heightCm = heightCm;
  }

  if ("price" in payload) {
    if (payload.price !== null && !isNonNegativeNumber(payload.price)) {
      return NextResponse.json(
        { message: "Az ár csak nem negatív szám lehet." },
        { status: 400 },
      );
    }

    updates.price = payload.price;
  }

  if ("coverImageUrl" in payload) {
    if (typeof payload.coverImageUrl !== "string") {
      return NextResponse.json(
        { message: "A borítókép URL mező értéke érvénytelen." },
        { status: 400 },
      );
    }

    updates.coverImageUrl = payload.coverImageUrl.trim();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { message: "Nincs menthető módosítás a kérésben." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const updatedBook = await BookModel.findByIdAndUpdate(
    bookId,
    {
      $set: updates,
    },
    {
      returnDocument: "after",
    },
  ).lean();

  if (!updatedBook) {
    return NextResponse.json(
      { message: "A könyv nem található." },
      { status: 404 },
    );
  }

  revalidatePath("/admin/books");
  revalidatePath("/books");

  const updatedFields = Object.keys(updates);
  const message =
    updatedFields.length === 1 && updatedFields[0] === "status"
      ? "A könyv státusza sikeresen frissült."
      : "A könyv adatai sikeresen frissültek.";

  return NextResponse.json({ message });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ bookId: string }> },
) {
  const access = await getAuthenticatedAdminWithPermission("books");

  if (access.status === "unauthenticated") {
    return NextResponse.json(
      { message: "A művelethez be kell jelentkezned." },
      { status: 401 },
    );
  }

  if (access.status === "forbidden") {
    return NextResponse.json(
      { message: "Nincs jogosultságod a könyvek kezeléséhez." },
      { status: 403 },
    );
  }

  const { bookId } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return NextResponse.json(
      { message: "Érvénytelen könyvazonosító." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const deletedBook = await BookModel.findByIdAndDelete(bookId).lean();

  if (!deletedBook) {
    return NextResponse.json(
      { message: "A könyv nem található." },
      { status: 404 },
    );
  }

  revalidatePath("/admin/books");
  revalidatePath("/books");

  return NextResponse.json({
    message: "A könyv sikeresen törölve lett.",
  });
}










