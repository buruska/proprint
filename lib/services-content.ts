import "server-only";

import { connectToDatabase } from "@/lib/mongodb";
import { ServicesPageModel } from "@/lib/models/services-page";

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

  const trimmed = value.trim().slice(0, maxLength);
  return trimmed;
}

export function sanitizeServicesPageInput(value: unknown): ServiceCardContent[] {
  const inputCards = Array.isArray(value) ? value : [];

  return DEFAULT_SERVICE_CARDS.map((defaultCard) => {
    const matchingCard = inputCards.find(
      (card) =>
        typeof card === "object" &&
        card !== null &&
        "id" in card &&
        card.id === defaultCard.id,
    ) as
      | {
          title?: unknown;
          coverImageUrl?: unknown;
          pricingText?: unknown;
        }
      | undefined;

    return {
      id: defaultCard.id,
      title: normalizeSingleLineText(matchingCard?.title, defaultCard.title, 160),
      coverImageUrl: normalizeMultilineText(matchingCard?.coverImageUrl, defaultCard.coverImageUrl, 500),
      pricingText: normalizeMultilineText(matchingCard?.pricingText, defaultCard.pricingText, 12000),
    };
  });
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

  return {
    cards: sanitizeServicesPageInput(page.cards),
    updatedAt:
      page.updatedAt instanceof Date
        ? page.updatedAt.toISOString()
        : typeof page.updatedAt === "string"
          ? new Date(page.updatedAt).toISOString()
          : null,
  };
}
