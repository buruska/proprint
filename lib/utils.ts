const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  bdquo: "„",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  laquo: "«",
  raquo: "»",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  aacute: "á",
  Aacute: "Á",
  eacute: "é",
  Eacute: "É",
  iacute: "í",
  Iacute: "Í",
  oacute: "ó",
  Oacute: "Ó",
  ouml: "ö",
  Ouml: "Ö",
  odblac: "ő",
  Odblac: "Ő",
  uacute: "ú",
  Uacute: "Ú",
  uuml: "ü",
  Uuml: "Ü",
  udblac: "ű",
  Udblac: "Ű",
  abreve: "ă",
  Abreve: "Ă",
  acirc: "â",
  Acirc: "Â",
  icirc: "î",
  Icirc: "Î",
  scedil: "ș",
  Scedil: "Ș",
  scaron: "ș",
  Scaron: "Ș",
  tcedil: "ț",
  Tcedil: "Ț",
  tcaron: "ț",
  Tcaron: "Ț",
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 0,
  }).format(value);
}

export function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("hu-HU")
    .replace(/[áàâäă]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòôöő]/g, "o")
    .replace(/[úùûüű]/g, "u")
    .replace(/ç/g, "c")
    .replace(/ş|ș/g, "s")
    .replace(/ţ|ț/g, "t");
}

export function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity in HTML_ENTITY_MAP) {
      return HTML_ENTITY_MAP[entity];
    }

    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const codePoint = Number.parseInt(entity.slice(2), 16);

      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    }

    if (entity.startsWith("#")) {
      const codePoint = Number.parseInt(entity.slice(1), 10);

      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    }

    return match;
  });
}
const LEGACY_ROMANIAN_CHARACTER_MAP: Record<string, string> = {
  "ã": "ă",
  "Ã": "Ă",
  "þ": "ț",
  "Þ": "Ț",
  "º": "ș",
  "ª": "Ș",
  "ş": "ș",
  "Ş": "Ș",
  "ţ": "ț",
  "Ţ": "Ț",
};

export function repairLegacyRomanianText(value: string) {
  return value.replace(/[ãÃþÞºªşŞţŢ]/g, (character) => {
    return LEGACY_ROMANIAN_CHARACTER_MAP[character] ?? character;
  });
}
export function normalizeLegacyBookDisplayText(value: string) {
  return repairLegacyRomanianText(decodeHtmlEntities(value));
}

export function normalizeRichTextToPlainText(value: string) {
  const normalizedLineEndings = value.replace(/\r\n?/g, "\n");
  const withParagraphs = normalizedLineEndings
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/p\s*>\s*<\s*p[^>]*>/gi, "\n\n")
    .replace(/<\s*p[^>]*>/gi, "")
    .replace(/<\s*\/p\s*>/gi, "");
  const withoutTags = withParagraphs.replace(/<[^>]+>/g, "");
  const decoded = decodeHtmlEntities(withoutTags);

  return decoded
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


