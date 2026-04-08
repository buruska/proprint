export type ManagedEbookFormat = "pdf" | "epub" | "mobi";

export const MANAGED_BOOK_COVER_URL_PREFIX = "/api/uploads/book-covers/";
export const MANAGED_CONTENT_IMAGE_URL_PREFIX = "/api/uploads/content-images/";
export const MANAGED_SERVICE_COVER_URL_PREFIX = "/api/uploads/service-covers/";
export const MANAGED_EBOOK_URL_PREFIX = "/api/uploads/ebooks/";

const URL_BASE = "http://localhost";

function getPathname(value: string) {
  try {
    return new URL(value, URL_BASE).pathname;
  } catch {
    return "";
  }
}

function decodePathSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function extractManagedFileId(pathname: string, prefix: string) {
  if (!pathname.startsWith(prefix)) {
    return "";
  }

  const encodedFileId = pathname.slice(prefix.length);

  if (!encodedFileId || encodedFileId.includes("/")) {
    return "";
  }

  return decodePathSegment(encodedFileId);
}

export function buildManagedBookCoverUrl(fileId: string) {
  return `${MANAGED_BOOK_COVER_URL_PREFIX}${encodeURIComponent(fileId)}`;
}

export function buildManagedContentImageUrl(fileId: string) {
  return `${MANAGED_CONTENT_IMAGE_URL_PREFIX}${encodeURIComponent(fileId)}`;
}

export function buildManagedServiceCoverUrl(fileId: string) {
  return `${MANAGED_SERVICE_COVER_URL_PREFIX}${encodeURIComponent(fileId)}`;
}

export function buildManagedEbookUrl(format: ManagedEbookFormat, fileId: string) {
  return `${MANAGED_EBOOK_URL_PREFIX}${format}/${encodeURIComponent(fileId)}`;
}

export function extractManagedBookCoverFileId(url: string) {
  return extractManagedFileId(getPathname(url), MANAGED_BOOK_COVER_URL_PREFIX);
}

export function extractManagedContentImageFileId(url: string) {
  return extractManagedFileId(getPathname(url), MANAGED_CONTENT_IMAGE_URL_PREFIX);
}

export function extractManagedServiceCoverFileId(url: string) {
  return extractManagedFileId(getPathname(url), MANAGED_SERVICE_COVER_URL_PREFIX);
}

export function extractManagedEbookFileId(url: string, format: ManagedEbookFormat) {
  return extractManagedFileId(
    getPathname(url),
    `${MANAGED_EBOOK_URL_PREFIX}${format}/`,
  );
}
