import { randomUUID } from "node:crypto";
import path from "node:path";

import { NextResponse } from "next/server";

import { getAuthenticatedAdminWithPermission } from "@/lib/admin-auth";
import {
  type UploadBucketName,
  uploadBufferToStorage,
} from "@/lib/gridfs-storage";
import { connectToDatabase } from "@/lib/mongodb";
import {
  buildManagedEbookUrl,
  type ManagedEbookFormat,
} from "@/lib/upload-url";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_FORMATS = new Set<ManagedEbookFormat>(["pdf", "epub", "mobi"]);
const FORMAT_CONFIG: Record<ManagedEbookFormat, {
  bucketName: UploadBucketName;
  extensions: string[];
  mimeTypes: string[];
  contentType: string;
  label: string;
}> = {
  pdf: {
    bucketName: "ebook-pdf",
    extensions: ["pdf"],
    mimeTypes: ["application/pdf"],
    contentType: "application/pdf",
    label: "PDF",
  },
  epub: {
    bucketName: "ebook-epub",
    extensions: ["epub"],
    mimeTypes: ["application/epub+zip"],
    contentType: "application/epub+zip",
    label: "EPUB",
  },
  mobi: {
    bucketName: "ebook-mobi",
    extensions: ["mobi"],
    mimeTypes: ["application/x-mobipocket-ebook", "application/octet-stream", ""],
    contentType: "application/x-mobipocket-ebook",
    label: "MOBI",
  },
};

function getFileExtension(file: File, format: ManagedEbookFormat) {
  const config = FORMAT_CONFIG[format];
  const mimeType = file.type.trim().toLowerCase();

  if (config.mimeTypes.includes(mimeType)) {
    return config.extensions[0];
  }

  const originalExtension = path.extname(file.name).toLowerCase().replace(/^\./, "");

  if (config.extensions.includes(originalExtension)) {
    return originalExtension;
  }

  return "";
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

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const formatValue = formData?.get("format");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "A feltöltéshez válassz ki egy fájlt." },
      { status: 400 },
    );
  }

  if (typeof formatValue !== "string" || !ALLOWED_FORMATS.has(formatValue as ManagedEbookFormat)) {
    return NextResponse.json(
      { message: "A fájlformátum érvénytelen." },
      { status: 400 },
    );
  }

  const format = formatValue as ManagedEbookFormat;

  if (file.size === 0) {
    return NextResponse.json(
      { message: "Az üres fájl nem tölthető fel." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { message: "Az e-könyv fájl legfeljebb 50 MB méretű lehet." },
      { status: 400 },
    );
  }

  const extension = getFileExtension(file, format);

  if (!extension) {
    return NextResponse.json(
      { message: `Csak ${FORMAT_CONFIG[format].label} formátumú fájl tölthető fel ebbe a mezőbe.` },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const fileId = await uploadBufferToStorage({
    bucketName: FORMAT_CONFIG[format].bucketName,
    buffer: fileBuffer,
    filename: fileName,
    contentType: FORMAT_CONFIG[format].contentType,
    metadata: {
      originalName: file.name,
      format,
      kind: "ebook",
    },
  });

  return NextResponse.json({
    message: `${FORMAT_CONFIG[format].label} fájl sikeresen feltöltve.`,
    url: buildManagedEbookUrl(format, fileId),
  });
}
