import "server-only";

import { connectToDatabase } from "@/lib/mongodb";
import { PageContentModel } from "@/lib/models/page-content";
import { extractManagedContentImageFileId } from "@/lib/upload-url";

export const HANDMADE_PAGE_SLUG = "handmade-page";

export type HandmadePageContent = {
  leadText: string;
  galleryImageUrls: string[];
  updatedAt: string | null;
};

export const DEFAULT_HANDMADE_PAGE_CONTENT = {
  leadText:
    "Kézzel készült, egyedi noteszek és határidőnaplók várják azokat, akik a papír, a kötészet és a személyes részletek szeretetével választanak ajándékot vagy mindennapi társat.",
  galleryImageUrls: [] as string[],
};

function normalizeMultilineText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || fallback;
}

function normalizeGalleryImageUrls(value: unknown) {
  if (!Array.isArray(value)) {
    return DEFAULT_HANDMADE_PAGE_CONTENT.galleryImageUrls;
  }

  const uniqueUrls = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const normalizedUrl = item.trim();

    if (!normalizedUrl) {
      continue;
    }

    const isManagedContentImage = Boolean(extractManagedContentImageFileId(normalizedUrl));
    const isHttpImage = /^https?:\/\//i.test(normalizedUrl);

    if (!isManagedContentImage && !isHttpImage) {
      continue;
    }

    uniqueUrls.add(normalizedUrl);

    if (uniqueUrls.size >= 24) {
      break;
    }
  }

  return Array.from(uniqueUrls);
}

export function sanitizeHandmadePageInput(
  value: { leadText?: unknown; galleryImageUrls?: unknown } | null | undefined,
) {
  return {
    leadText: normalizeMultilineText(
      value?.leadText,
      DEFAULT_HANDMADE_PAGE_CONTENT.leadText,
      5000,
    ),
    galleryImageUrls: normalizeGalleryImageUrls(value?.galleryImageUrls),
  };
}

export async function getHandmadePageContent(): Promise<HandmadePageContent> {
  await connectToDatabase();

  const handmadePage = await PageContentModel.findOne({ slug: HANDMADE_PAGE_SLUG }).lean();

  if (!handmadePage) {
    return {
      leadText: DEFAULT_HANDMADE_PAGE_CONTENT.leadText,
      galleryImageUrls: [...DEFAULT_HANDMADE_PAGE_CONTENT.galleryImageUrls],
      updatedAt: null,
    };
  }

  const normalizedContent = sanitizeHandmadePageInput({
    leadText: handmadePage.bodyHtml,
    galleryImageUrls: handmadePage.galleryImageUrls,
  });

  return {
    ...normalizedContent,
    updatedAt:
      handmadePage.updatedAt instanceof Date
        ? handmadePage.updatedAt.toISOString()
        : typeof handmadePage.updatedAt === "string"
          ? new Date(handmadePage.updatedAt).toISOString()
          : null,
  };
}
