import { NextResponse } from "next/server";

import {
  getStoredUpload,
  toWebReadableStream,
  type UploadBucketName,
} from "@/lib/gridfs-storage";
import { connectToDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";

const BOOK_COVER_BUCKET: UploadBucketName = "book-covers";

function createInlineContentDisposition(filename: string) {
  return `inline; filename*=UTF-8''${encodeURIComponent(filename)}`;
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await context.params;

  await connectToDatabase();

  const storedUpload = await getStoredUpload(BOOK_COVER_BUCKET, fileId);

  if (!storedUpload) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filename = storedUpload.file.filename || `book-cover-${fileId}`;
  const contentType = getStoredUploadContentType(
    storedUpload.file,
    "application/octet-stream",
  );
  const headers = new Headers({
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Disposition": createInlineContentDisposition(filename),
    "Content-Length": `${storedUpload.file.length}`,
    "Content-Type": contentType,
  });

  return new Response(toWebReadableStream(storedUpload.stream), {
    headers,
    status: 200,
  });
}
