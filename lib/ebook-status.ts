export const EBOOK_STATUS_VALUES = ["draft", "published"] as const;

export type EbookStatus = (typeof EBOOK_STATUS_VALUES)[number];

export const EBOOK_STATUS_LABELS: Record<EbookStatus, string> = {
  draft: "Vázlat",
  published: "Publikált",
};
