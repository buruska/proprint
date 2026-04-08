export const BOOK_LANGUAGE_VALUES = ["magyar", "román", "angol", "német"] as const;

export type BookLanguage = (typeof BOOK_LANGUAGE_VALUES)[number];

export const BOOK_LANGUAGE_LABELS: Record<BookLanguage, string> = {
  magyar: "Magyar",
  román: "Román",
  angol: "Angol",
  német: "Német",
};

export function normalizeBookLanguage(value: string): BookLanguage | "" {
  const normalizedValue = value.trim().toLocaleLowerCase("hu-HU");

  switch (normalizedValue) {
    case "magyar":
    case "hu":
    case "hungarian":
      return "magyar";
    case "román":
    case "roman":
    case "ro":
    case "romanian":
      return "román";
    case "angol":
    case "en":
    case "english":
      return "angol";
    case "német":
    case "nemet":
    case "de":
    case "german":
    case "deutsch":
      return "német";
    default:
      return "";
  }
}
