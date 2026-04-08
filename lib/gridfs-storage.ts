import { Readable } from "node:stream";

import mongoose from "mongoose";

export type UploadBucketName =
  | "book-covers"
  | "content-images"
  | "service-covers"
  | "ebook-pdf"
  | "ebook-epub"
  | "ebook-mobi";

type UploadBufferParams = {
  bucketName: UploadBucketName;
  buffer: Buffer;
  filename: string;
  contentType: string;
  metadata?: Record<string, unknown>;
};

function getBucket(bucketName: UploadBucketName) {
  const database = mongoose.connection.db;

  if (!database) {
    throw new Error("A MongoDB kapcsolat nem elerheto.");
  }

  return new mongoose.mongo.GridFSBucket(database, {
    bucketName,
  });
}

function createObjectId(fileId: string) {
  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    return null;
  }

  return new mongoose.Types.ObjectId(fileId);
}

export async function uploadBufferToStorage({
  bucketName,
  buffer,
  filename,
  contentType,
  metadata,
}: UploadBufferParams) {
  const fileId = new mongoose.Types.ObjectId();
  const bucket = getBucket(bucketName);

  await new Promise<void>((resolve, reject) => {
    const uploadStream = bucket.openUploadStreamWithId(fileId, filename, {
      metadata: {
        ...metadata,
        contentType,
      },
    });

    uploadStream.once("error", reject);
    uploadStream.once("finish", () => resolve());
    uploadStream.end(buffer);
  });

  return fileId.toString();
}

export async function getStoredUpload(bucketName: UploadBucketName, fileId: string) {
  const objectId = createObjectId(fileId);

  if (!objectId) {
    return null;
  }

  const bucket = getBucket(bucketName);
  const files = await bucket.find({ _id: objectId }).limit(1).toArray();
  const file = files[0];

  if (!file) {
    return null;
  }

  return {
    file,
    stream: bucket.openDownloadStream(objectId),
  };
}

export async function deleteStoredUpload(bucketName: UploadBucketName, fileId: string) {
  const objectId = createObjectId(fileId);

  if (!objectId) {
    return false;
  }

  const bucket = getBucket(bucketName);
  const files = await bucket.find({ _id: objectId }).limit(1).toArray();

  if (files.length === 0) {
    return false;
  }

  await bucket.delete(objectId);
  return true;
}

export function toWebReadableStream(stream: Readable) {
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}
