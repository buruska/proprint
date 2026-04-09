import "server-only";

import { connectToDatabase } from "@/lib/mongodb";
import { PageContentModel } from "@/lib/models/page-content";

export const HANDMADE_PAGE_SLUG = "handmade-page";

export type HandmadePageContent = {
  leadText: string;
  updatedAt: string | null;
};

export const DEFAULT_HANDMADE_PAGE_CONTENT = {
  leadText:
    "Kézzel készült, egyedi noteszek és határidőnaplók várják azokat, akik a papír, a kötészet és a személyes részletek szeretetével választanak ajándékot vagy mindennapi társat.",
} as const;

function normalizeMultilineText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || fallback;
}

export function sanitizeHandmadePageInput(value: { leadText?: unknown } | null | undefined) {
  return {
    leadText: normalizeMultilineText(
      value?.leadText,
      DEFAULT_HANDMADE_PAGE_CONTENT.leadText,
      5000,
    ),
  };
}

export async function getHandmadePageContent(): Promise<HandmadePageContent> {
  await connectToDatabase();

  const handmadePage = await PageContentModel.findOne({ slug: HANDMADE_PAGE_SLUG }).lean();

  if (!handmadePage) {
    return {
      ...DEFAULT_HANDMADE_PAGE_CONTENT,
      updatedAt: null,
    };
  }

  const normalizedContent = sanitizeHandmadePageInput({
    leadText: handmadePage.bodyHtml,
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
