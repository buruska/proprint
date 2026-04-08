import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { hasAdminPermission } from "@/lib/admin-permissions";
import {
  getStoredUpload,
  toWebReadableStream,
  type UploadBucketName,
} from "@/lib/gridfs-storage";
import { connectToDatabase } from "@/lib/mongodb";
import type { ManagedEbookFormat } from "@/lib/upload-url";

export const runtime = "nodejs";

const EBOOK_BUCKETS: Record<ManagedEbookFormat, UploadBucketName> = {
  pdf: "ebook-pdf",
  epub: "ebook-epub",
  mobi: "ebook-mobi",
};

const EBOOK_CONTENT_TYPES: Record<ManagedEbookFormat, string> = {
  pdf: "application/pdf",
  epub: "application/epub+zip",
  mobi: "application/x-mobipocket-ebook",
};

function isManagedEbookFormat(value: string): value is ManagedEbookFormat {
  return value === "pdf" || value === "epub" || value === "mobi";
}

function createContentDisposition(format: ManagedEbookFormat, filename: string) {
  const dispositionType = format === "pdf" ? "inline" : "attachment";
  return `${dispositionType}; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function getStoredUploadContentType(
  file: { metadata?: unknown },
  fallbackContentType: string,
) {
  const metadata = file.metadata as { contentType?: unknown } | undefined;

  return typeof metadata?.contentType === "string"
    ? metadata.contentType
    : fallbackContentType;
}

async function ensureAuthorizedAdminSession() {
  const session = await getServerSession(authOptions);
  const normalizedEmail = session?.user?.email?.trim().toLowerCase();
  const role = session?.user?.role;

  if (!normalizedEmail) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!hasAdminPermission({ role }, "ebooks")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ format: string; fileId: string }> },
) {
  const unauthorizedResponse = await ensureAuthorizedAdminSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { format, fileId } = await context.params;

  if (!isManagedEbookFormat(format)) {
    return new NextResponse("Not found", { status: 404 });
  }

  await connectToDatabase();

  const storedUpload = await getStoredUpload(EBOOK_BUCKETS[format], fileId);

  if (!storedUpload) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filename = storedUpload.file.filename || `ebook-${fileId}.${format}`;
  const contentType = getStoredUploadContentType(
    storedUpload.file,
    EBOOK_CONTENT_TYPES[format],
  );
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Disposition": createContentDisposition(format, filename),
    "Content-Length": `${storedUpload.file.length}`,
    "Content-Type": contentType,
  });

  return new Response(toWebReadableStream(storedUpload.stream), {
    headers,
    status: 200,
  });
}
