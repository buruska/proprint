import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAuthenticatedAdminWithPermission } from "@/lib/admin-auth";

import { BOOK_STATUS_VALUES, type BookStatus } from "@/lib/book-status";
import { normalizeBookLanguage } from "@/lib/book-language";
import { formatBookIsbn } from "@/lib/book-isbn";
import { getBookSizeDimensions, normalizeBookSizeValue } from "@/lib/book-size";

import { connectToDatabase } from "@/lib/mongodb";
import { BookModel } from "@/lib/models/book";
import { normalizeRichTextToPlainText } from "@/lib/utils";

type CreatePayload = {
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

function isLegacyIdDuplicateKeyError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const duplicateKeyError = error as {
    code?: unknown;
    keyPattern?: Record<string, unknown>;
  };

  return duplicateKeyError.code === 11000 && duplicateKeyError.keyPattern?.legacyId === 1;
}
function serializeAdminBookListItem(book: {
  _id: { toString(): string } | string;
  title?: string;
  author?: string;
  language?: string;
  description?: string;
  publicationYear?: number | null;
  publicationDate?: Date | string | null;
  isbn?: string;
  pageCount?: number | null;
  keywords?: unknown;
  size?: string;
  price?: number | null;
  coverImageUrl?: string;
  status?: string;
}) {
  return {
    id: typeof book._id === "string" ? book._id : book._id.toString(),
    title: book.title ?? "Cím nélkül",
    author: book.author ?? "",
    language: book.language ?? "",
    description: normalizeRichTextToPlainText(book.description ?? ""),
    publicationYear:
      typeof book.publicationYear === "number" ? book.publicationYear : null,
    publicationDate: book.publicationDate
      ? new Date(book.publicationDate).toISOString().slice(0, 10)
      : "",
    isbn: book.isbn ?? "",
    pageCount: typeof book.pageCount === "number" ? book.pageCount : null,
    keywords: Array.isArray(book.keywords)
      ? book.keywords.filter((keyword): keyword is string => typeof keyword === "string")
      : [],
    size: book.size ?? "",
    price: typeof book.price === "number" ? book.price : null,
    coverImageUrl: book.coverImageUrl ?? "",
    status: BOOK_STATUS_VALUES.includes(book.status as BookStatus)
      ? (book.status as BookStatus)
      : "draft",
  };
}

export async function POST(request: Request) {
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

  const payload = (await request.json().catch(() => null)) as CreatePayload | null;

  if (!payload) {
    return NextResponse.json(
      { message: "A kérés törzse nem értelmezhető." },
      { status: 400 },
    );
  }

  if (typeof payload.title !== "string" || !payload.title.trim()) {
    return NextResponse.json(
      { message: "A könyv címe kötelező." },
      { status: 400 },
    );
  }

  if (typeof payload.author !== "string") {
    return NextResponse.json(
      { message: "A szerző mező értéke érvénytelen." },
      { status: 400 },
    );
  }

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

  if (typeof payload.description !== "string") {
    return NextResponse.json(
      { message: "A leírás mező értéke érvénytelen." },
      { status: 400 },
    );
  }

  if (payload.publicationDate !== null && typeof payload.publicationDate !== "string") {
    return NextResponse.json(
      { message: "A kiadási dátum formátuma érvénytelen." },
      { status: 400 },
    );
  }

  let publicationDate: Date | null = null;
  let publicationYear: number | null = null;

  if (typeof payload.publicationDate === "string" && payload.publicationDate.trim()) {
    const normalizedDate = payload.publicationDate.trim();

    if (!isValidDateInput(normalizedDate)) {
      return NextResponse.json(
        { message: "A kiadási dátum formátuma érvénytelen." },
        { status: 400 },
      );
    }

    publicationDate = new Date(`${normalizedDate}T00:00:00.000Z`);
    publicationYear = Number(normalizedDate.slice(0, 4));
  }

  if (typeof payload.isbn !== "string") {
    return NextResponse.json(
      { message: "Az ISBN mező értéke érvénytelen." },
      { status: 400 },
    );
  }

  if (payload.pageCount !== null && payload.pageCount !== undefined && !isNonNegativeInteger(payload.pageCount)) {
    return NextResponse.json(
      { message: "Az oldalszám csak nem negatív egész szám lehet." },
      { status: 400 },
    );
  }

  if (
    !Array.isArray(payload.keywords) ||
    payload.keywords.some((keyword) => typeof keyword !== "string")
  ) {
    return NextResponse.json(
      { message: "A kulcsszavak formátuma érvénytelen." },
      { status: 400 },
    );
  }

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

  const { widthCm, heightCm } = getBookSizeDimensions(normalizedSize);

  if (payload.price !== null && payload.price !== undefined && !isNonNegativeNumber(payload.price)) {
    return NextResponse.json(
      { message: "Az ár csak nem negatív szám lehet." },
      { status: 400 },
    );
  }

  if (typeof payload.coverImageUrl !== "string") {
    return NextResponse.json(
      { message: "A borítókép URL mező értéke érvénytelen." },
      { status: 400 },
    );
  }

  if (
    typeof payload.status !== "string" ||
    !BOOK_STATUS_VALUES.includes(payload.status as BookStatus)
  ) {
    return NextResponse.json(
      { message: "Érvénytelen státuszérték." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  try {
    const createdBook = await BookModel.create({
      title: payload.title.trim(),
      author: payload.author.trim(),
      language: normalizedLanguage,
      description: normalizeRichTextToPlainText(payload.description),
      publicationYear,
      publicationDate,
      isbn: formatBookIsbn(payload.isbn),
      pageCount: payload.pageCount ?? null,
      keywords: payload.keywords
        .map((keyword) => keyword.trim())
        .filter(Boolean),
      size: normalizedSize,
      widthCm,
      heightCm,
      price: payload.price ?? null,
      coverImageUrl: payload.coverImageUrl.trim(),
      status: payload.status,
    });

    revalidatePath("/admin/books");
    revalidatePath("/books");

    return NextResponse.json(
      {
        message: "Az új könyv sikeresen létrejött.",
        book: serializeAdminBookListItem(createdBook.toObject()),
      },
      { status: 201 },
    );
  } catch (error) {
    if (isLegacyIdDuplicateKeyError(error)) {
      return NextResponse.json(
        {
          message: "A legacyId egyedi indexe hibasan blokkolja az uj konyvek letrehozasat. Az adatbazis index javitasa szukseges.",
        },
        { status: 409 },
      );
    }

    throw error;
  }
}

