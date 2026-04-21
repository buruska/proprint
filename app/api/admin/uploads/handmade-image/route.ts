import { randomUUID } from "node:crypto";
import path from "node:path";

import { NextResponse } from "next/server";

import { getAuthenticatedAdminWithPermission } from "@/lib/admin-auth";
import {
  type UploadBucketName,
  uploadBufferToStorage,
} from "@/lib/gridfs-storage";
import { connectToDatabase } from "@/lib/mongodb";
import { buildManagedContentImageUrl } from "@/lib/upload-url";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const HANDMADE_IMAGE_BUCKET: UploadBucketName = "content-images";
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

export async function POST(request: Request) {
  const access = await getAuthenticatedAdminWithPermission("handmade");

  if (access.status === "unauthenticated") {
    return NextResponse.json(
      { message: "A művelethez be kell jelentkezned." },
      { status: 401 },
    );
  }

  if (access.status === "forbidden") {
    return NextResponse.json(
      { message: "Nincs jogosultságod a Handmade galéria képeinek feltöltéséhez." },
      { status: 403 },
    );
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
      { message: "A galériakép legfeljebb 8 MB méretű lehet." },
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
    bucketName: HANDMADE_IMAGE_BUCKET,
    buffer: fileBuffer,
    filename: fileName,
    contentType,
    metadata: {
      originalName: file.name,
      kind: "handmade-image",
    },
  });

  return NextResponse.json({
    message: "A galériakép sikeresen feltöltve.",
    url: buildManagedContentImageUrl(fileId),
  });
}
