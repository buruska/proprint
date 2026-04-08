export const BOOK_STATUS_VALUES = [
  "draft",
  "unavailable",
  "preorder",
  "in-stock",
] as const;

export type BookStatus = (typeof BOOK_STATUS_VALUES)[number];

export const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  draft: "Vázlat",
  unavailable: "Jelenleg nem elérhető",
  preorder: "Előrendelhető",
  "in-stock": "Raktáron",
};
