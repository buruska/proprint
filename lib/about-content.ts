import "server-only";

import { connectToDatabase } from "@/lib/mongodb";
import { PageContentModel } from "@/lib/models/page-content";
import {
  DEFAULT_ABOUT_PAGE_CONTENT,
  normalizeRichPageHtml,
  type AboutPageContent,
  type EditablePageContent,
} from "@/lib/rich-page-content";

export const ABOUT_PAGE_SLUG = "about-page";

const ABOUT_TEXT_LIMITS = {
  eyebrow: 80,
  title: 180,
  description: 320,
  bodyHtml: 50000,
} as const;

function normalizeSingleLineText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.replace(/\s+/g, " ").trim().slice(0, maxLength);
  return trimmed || fallback;
}

function normalizeMultilineText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || fallback;
}

export function sanitizeAboutPageInput(value: Partial<EditablePageContent> | null | undefined) {
  return {
    eyebrow: normalizeSingleLineText(
      value?.eyebrow,
      DEFAULT_ABOUT_PAGE_CONTENT.eyebrow,
      ABOUT_TEXT_LIMITS.eyebrow,
    ),
    title: normalizeSingleLineText(
      value?.title,
      DEFAULT_ABOUT_PAGE_CONTENT.title,
      ABOUT_TEXT_LIMITS.title,
    ),
    description: normalizeSingleLineText(
      value?.description,
      DEFAULT_ABOUT_PAGE_CONTENT.description,
      ABOUT_TEXT_LIMITS.description,
    ),
    bodyHtml: normalizeRichPageHtml(
      normalizeMultilineText(
        value?.bodyHtml,
        DEFAULT_ABOUT_PAGE_CONTENT.bodyHtml,
        ABOUT_TEXT_LIMITS.bodyHtml,
      ),
    ),
  };
}

export async function getAboutPageContent(): Promise<AboutPageContent> {
  await connectToDatabase();

  const aboutPage = await PageContentModel.findOne({ slug: ABOUT_PAGE_SLUG }).lean();

  if (!aboutPage) {
    return {
      ...DEFAULT_ABOUT_PAGE_CONTENT,
      updatedAt: null,
    };
  }

  const normalizedContent = sanitizeAboutPageInput({
    eyebrow: aboutPage.eyebrow,
    title: aboutPage.title,
    description: aboutPage.description,
    bodyHtml: aboutPage.bodyHtml,
  });

  return {
    ...normalizedContent,
    updatedAt:
      aboutPage.updatedAt instanceof Date
        ? aboutPage.updatedAt.toISOString()
        : typeof aboutPage.updatedAt === "string"
          ? new Date(aboutPage.updatedAt).toISOString()
          : null,
  };
}
