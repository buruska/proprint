import { randomUUID } from "node:crypto";
import path from "node:path";

import { NextResponse } from "next/server";

import { getAuthenticatedAdminWithPermission } from "@/lib/admin-auth";
import {
  deleteStoredUpload,
  type UploadBucketName,
  uploadBufferToStorage,
} from "@/lib/gridfs-storage";
import { connectToDatabase } from "@/lib/mongodb";
import {
  buildManagedBookCoverUrl,
  extractManagedBookCoverFileId,
} from "@/lib/upload-url";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const BOOK_COVER_BUCKET: UploadBucketName = "book-covers";
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};
const EXTENSION_TO_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

function getFileExtension(file: File) {
  const mimeType = file.type.trim().toLowerCase();

  if (mimeType in MIME_TO_EXTENSION) {
    return MIME_TO_EXTENSION[mimeType];
  }

  const originalExtension = path.extname(file.name).toLowerCase().replace(/^\./, "");

  if (ALLOWED_EXTENSIONS.has(originalExtension)) {
    return originalExtension === "jpeg" ? "jpg" : originalExtension;
  }

  return "";
}

async function ensureBooksAccess() {
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

  return null;
}

export async function POST(request: Request) {
  const unauthorizedResponse = await ensureBooksAccess();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "A feltöltéshez válassz ki egy képfájlt." },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { message: "Az üres fájl nem tölthető fel." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { message: "A borítókép legfeljebb 5 MB méretű lehet." },
      { status: 400 },
    );
  }

  const extension = getFileExtension(file);

  if (!extension) {
    return NextResponse.json(
      { message: "Csak JPG, PNG, WEBP, GIF vagy AVIF formátumú kép tölthető fel." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const contentType = EXTENSION_TO_CONTENT_TYPE[extension] || "application/octet-stream";
  const fileId = await uploadBufferToStorage({
    bucketName: BOOK_COVER_BUCKET,
    buffer: fileBuffer,
    filename: fileName,
    contentType,
    metadata: {
      originalName: file.name,
      kind: "book-cover",
    },
  });

  return NextResponse.json({
    message: "A borítókép sikeresen feltöltve.",
    url: buildManagedBookCoverUrl(fileId),
  });
}

export async function DELETE(request: Request) {
  const unauthorizedResponse = await ensureBooksAccess();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const payload = (await request.json().catch(() => null)) as { url?: unknown } | null;

  if (!payload || typeof payload.url !== "string") {
    return NextResponse.json(
      { message: "A törléshez hiányzik a borítókép URL-je." },
      { status: 400 },
    );
  }

  const fileId = extractManagedBookCoverFileId(payload.url);

  if (!fileId) {
    return NextResponse.json(
      { message: "Csak a rendszerben tarolt boritokepek torolhetok automatikusan." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const deleted = await deleteStoredUpload(BOOK_COVER_BUCKET, fileId);

  if (!deleted) {
    return NextResponse.json(
      { message: "A borítókép már nem található." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    message: "A borítókép sikeresen törölve lett.",
  });
}
