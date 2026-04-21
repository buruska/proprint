import "server-only";

import { connectToDatabase } from "@/lib/mongodb";
import { ServicesPageModel } from "@/lib/models/services-page";
import { normalizeRichPageHtml } from "@/lib/rich-page-content";

export const SERVICES_PAGE_SLUG = "services-page";

export const DEFAULT_SERVICE_CARDS = [
  {
    id: "stamps",
    title: "Bélyegzők",
    coverImageUrl: "",
    pricingText: "",
  },
  {
    id: "copy-print",
    title: "Fénymásolás, nyomtatás",
    coverImageUrl: "",
    pricingText: "",
  },
  {
    id: "laser-engraving",
    title: "Lézergravírozás",
    coverImageUrl: "",
    pricingText: "",
  },
  {
    id: "thesis-binding",
    title: "Vizsgadolgozat-bekötés",
    coverImageUrl: "",
    pricingText: "",
  },
] as const;

export type ServiceCardContent = {
  id: string;
  title: string;
  coverImageUrl: string;
  pricingText: string;
};

export type ServicesPageContent = {
  cards: ServiceCardContent[];
  updatedAt: string | null;
};

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

  return value.trim().slice(0, maxLength);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plainTextToHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

function normalizeServicePricingText(value: unknown) {
  const normalizedValue = normalizeMultilineText(value, "", 12000);

  if (!normalizedValue) {
    return "";
  }

  const containsNonImageHtml = /<\s*(?!\/?\s*img\b)[a-z!/]/i.test(normalizedValue);

  if (containsNonImageHtml) {
    return normalizeRichPageHtml(normalizedValue);
  }

  const sanitizedImages: string[] = [];
  const withPlaceholders = normalizedValue.replace(/<img\b[^>]*>/gi, (match) => {
    const sanitizedImage = normalizeRichPageHtml(match);

    if (!sanitizedImage) {
      return "";
    }

    const placeholder = `__SERVICE_IMAGE_${sanitizedImages.length}__`;
    sanitizedImages.push(sanitizedImage);
    return `\n\n${placeholder}\n\n`;
  });

  const html = plainTextToHtml(withPlaceholders).replace(
    /<p>(__SERVICE_IMAGE_(\d+)__)<\/p>/g,
    (_match, _placeholder, imageIndex) => sanitizedImages[Number(imageIndex)] ?? "",
  );

  return normalizeRichPageHtml(html);
}

function normalizeServiceCardId(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || fallback;
}

export function sanitizeServicesPageInput(value: unknown): ServiceCardContent[] {
  const inputCards = Array.isArray(value) ? value : [];

  return inputCards.reduce<ServiceCardContent[]>((result, card, index) => {
    if (typeof card !== "object" || card === null) {
      return result;
    }

    const record = card as {
      id?: unknown;
      title?: unknown;
      coverImageUrl?: unknown;
      pricingText?: unknown;
    };

    const title = normalizeSingleLineText(record.title, "", 160);

    if (!title) {
      return result;
    }

    const fallbackId = `service-${index + 1}`;
    let id = normalizeServiceCardId(record.id, fallbackId);

    if (result.some((item) => item.id === id)) {
      let suffix = 2;
      while (result.some((item) => item.id === `${id}-${suffix}`)) {
        suffix += 1;
      }
      id = `${id}-${suffix}`;
    }

    result.push({
      id,
      title,
      coverImageUrl: normalizeMultilineText(record.coverImageUrl, "", 500),
      pricingText: normalizeServicePricingText(record.pricingText),
    });

    return result;
  }, []);
}

export async function getServicesPageContent(): Promise<ServicesPageContent> {
  await connectToDatabase();

  const page = await ServicesPageModel.findOne({ slug: SERVICES_PAGE_SLUG }).lean();

  if (!page) {
    return {
      cards: sanitizeServicesPageInput(DEFAULT_SERVICE_CARDS),
      updatedAt: null,
    };
  }

  const cards = sanitizeServicesPageInput(page.cards);

  return {
    cards: cards.length > 0 ? cards : sanitizeServicesPageInput(DEFAULT_SERVICE_CARDS),
    updatedAt:
      page.updatedAt instanceof Date
        ? page.updatedAt.toISOString()
        : typeof page.updatedAt === "string"
          ? new Date(page.updatedAt).toISOString()
          : null,
  };
}
