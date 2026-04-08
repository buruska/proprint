import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAuthenticatedAdminWithPermission } from "@/lib/admin-auth";


import {
  EBOOK_STATUS_VALUES,
  EBOOK_STATUS_LABELS,
  type EbookStatus,
} from "@/lib/ebook-status";
import { connectToDatabase } from "@/lib/mongodb";
import { EbookModel } from "@/lib/models/ebook";

type CreatePayload = {
  title?: unknown;
  author?: unknown;
  coverImageUrl?: unknown;
  pdfUrl?: unknown;
  epubUrl?: unknown;
  mobiUrl?: unknown;
  status?: unknown;
};

function serializeAdminEbook(book: {
  _id: { toString(): string } | string;
  title?: string;
  author?: string;
  coverImageUrl?: string;
  pdfUrl?: string;
  epubUrl?: string;
  mobiUrl?: string;
  status?: string;
  createdAt?: Date | string | null;
}) {
  const status = EBOOK_STATUS_VALUES.includes(book.status as EbookStatus)
    ? (book.status as EbookStatus)
    : "draft";

  return {
    id: typeof book._id === "string" ? book._id : book._id.toString(),
    title: book.title ?? "Cím nélkül",
    author: book.author ?? "",
    coverImageUrl: book.coverImageUrl ?? "",
    pdfUrl: book.pdfUrl ?? "",
    epubUrl: book.epubUrl ?? "",
    mobiUrl: book.mobiUrl ?? "",
    status,
    statusLabel: EBOOK_STATUS_LABELS[status],
    createdAt: book.createdAt ? new Date(book.createdAt).toISOString() : "",
  };
}

export async function POST(request: Request) {
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

  const payload = (await request.json().catch(() => null)) as CreatePayload | null;

  if (!payload) {
    return NextResponse.json(
      { message: "A kérés törzse nem értelmezhető." },
      { status: 400 },
    );
  }

  if (typeof payload.title !== "string" || !payload.title.trim()) {
    return NextResponse.json(
      { message: "Az e-könyv címe kötelező." },
      { status: 400 },
    );
  }

  if (typeof payload.author !== "string") {
    return NextResponse.json(
      { message: "A szerző mező értéke érvénytelen." },
      { status: 400 },
    );
  }

  if (typeof payload.coverImageUrl !== "string" || !payload.coverImageUrl.trim()) {
    return NextResponse.json(
      { message: "A borítókép feltöltése kötelező." },
      { status: 400 },
    );
  }

  if (typeof payload.pdfUrl !== "string") {
    return NextResponse.json(
      { message: "A PDF mező értéke érvénytelen." },
      { status: 400 },
    );
  }

  if (typeof payload.epubUrl !== "string") {
    return NextResponse.json(
      { message: "Az EPUB mező értéke érvénytelen." },
      { status: 400 },
    );
  }

  if (typeof payload.mobiUrl !== "string") {
    return NextResponse.json(
      { message: "A MOBI mező értéke érvénytelen." },
      { status: 400 },
    );
  }

  if (!payload.pdfUrl.trim() && !payload.epubUrl.trim() && !payload.mobiUrl.trim()) {
    return NextResponse.json(
      { message: "A PDF, EPUB és MOBI fájlok közül legalább egy feltöltése kötelező." },
      { status: 400 },
    );
  }

  if (
    typeof payload.status !== "string" ||
    !EBOOK_STATUS_VALUES.includes(payload.status as EbookStatus)
  ) {
    return NextResponse.json(
      { message: "A státusz csak vázlat vagy publikált lehet." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const createdEbook = await EbookModel.create({
    title: payload.title.trim(),
    author: payload.author.trim(),
    coverImageUrl: payload.coverImageUrl.trim(),
    pdfUrl: payload.pdfUrl.trim(),
    epubUrl: payload.epubUrl.trim(),
    mobiUrl: payload.mobiUrl.trim(),
    status: payload.status,
  });

  revalidatePath("/admin/ebooks");

  return NextResponse.json(
    {
      message: "Az új e-könyv sikeresen létrejött.",
      ebook: serializeAdminEbook(createdEbook.toObject()),
    },
    { status: 201 },
  );
}






