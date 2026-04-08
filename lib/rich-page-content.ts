export type EditablePageContent = {
  eyebrow: string;
  title: string;
  description: string;
  bodyHtml: string;
};

export type AboutPageContent = EditablePageContent & {
  updatedAt: string | null;
};

export const DEFAULT_ABOUT_PAGE_CONTENT: EditablePageContent = {
  eyebrow: "Kiadóról",
  title:
    "Egy kisebb kiadó weboldalának nemcsak informatívnak, hanem karakteresnek is kell lennie.",
  description:
    "Ez az oldalváz a kiadói hitvallás, a szerkesztőségi szemlélet és a katalógus arculatának közös bemutatására készült.",
  bodyHtml: [
    "<p>A ProPrint olyan kiadói márkaként jelenik meg, amelynél a könyv tárgyként, kulturális eseményként és hosszabb távú olvasói kapcsolódásként egyszerre fontos.</p>",
    "<p>Az oldal feladata ezért nemcsak az, hogy listázzon, hanem hogy hangulatot, bizalmat és egyértelmű szerkesztői karaktert is építsen.</p>",
    "<h3>Szerkesztői figyelem</h3>",
    "<p>Minden kézirat külön munkafolyamatot, ütemezést és vizuális koncepciót kap.</p>",
    "<h3>Épített katalógus</h3>",
    "<p>A listázott könyvek nem elszigetelt termékek, hanem egymást erősítő kiadói program részei.</p>",
    "<h3>Közvetlen olvasói kapcsolat</h3>",
    "<p>Az emailes rendelés lehetőséget hagy személyes hangú visszaigazolásra és ajánlásokra is.</p>",
  ].join("\n"),
};

const DISALLOWED_BLOCK_TAGS =
  /<\s*(script|style|iframe|object|embed|form|input|button|textarea|select|svg|math|meta|link)\b[\s\S]*?<\s*\/\s*\1\s*>/gi;
const DISALLOWED_SINGLE_TAGS =
  /<\s*\/?\s*(script|style|iframe|object|embed|form|input|button|textarea|select|svg|math|meta|link)\b[^>]*>/gi;
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "em",
  "u",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "img",
]);
const SELF_CLOSING_TAGS = new Set(["br", "img"]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/\n/g, " ").trim();
}

function normalizeWhitespace(value: string) {
  return value.replace(/\r\n?/g, "\n").trim();
}

function plainTextToHtml(value: string) {
  return normalizeWhitespace(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

function parseAttributes(rawAttributes: string) {
  const attributes: Record<string, string> = {};
  const attributePattern =
    /([^\s\"'<>\/=]+)(?:\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s\"'=<>`]+)))?/g;

  let match = attributePattern.exec(rawAttributes);

  while (match) {
    const attributeName = match[1]?.toLowerCase();

    if (attributeName) {
      const attributeValue = match[2] ?? match[3] ?? match[4] ?? "";
      attributes[attributeName] = attributeValue;
    }

    match = attributePattern.exec(rawAttributes);
  }

  return attributes;
}

function sanitizeLinkHref(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return trimmed;
  }

  const compact = trimmed.replace(/[\u0000-\u001f\u007f\s]+/g, "").toLowerCase();

  if (
    compact.startsWith("http://") ||
    compact.startsWith("https://") ||
    compact.startsWith("mailto:") ||
    compact.startsWith("tel:")
  ) {
    return trimmed;
  }

  return "";
}

function sanitizeImageSrc(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  const compact = trimmed.replace(/[\u0000-\u001f\u007f\s]+/g, "").toLowerCase();

  if (compact.startsWith("http://") || compact.startsWith("https://")) {
    return trimmed;
  }

  return "";
}

function sanitizeTag(tagName: string, rawAttributes: string, isClosingTag: boolean) {
  if (!ALLOWED_TAGS.has(tagName)) {
    return "";
  }

  if (isClosingTag) {
    return SELF_CLOSING_TAGS.has(tagName) ? "" : `</${tagName}>`;
  }

  if (tagName === "br") {
    return "<br />";
  }

  const attributes = parseAttributes(rawAttributes);

  if (tagName === "a") {
    const href = sanitizeLinkHref(attributes.href ?? "");

    if (!href) {
      return "<a>";
    }

    const escapedHref = escapeAttribute(href);

    if (/^https?:\/\//i.test(href)) {
      return `<a href="${escapedHref}" target="_blank" rel="noreferrer noopener">`;
    }

    return `<a href="${escapedHref}">`;
  }

  if (tagName === "img") {
    const src = sanitizeImageSrc(attributes.src ?? "");

    if (!src) {
      return "";
    }

    const alt = escapeAttribute(attributes.alt ?? "");
    return `<img src="${escapeAttribute(src)}" alt="${alt}" />`;
  }

  return `<${tagName}>`;
}

export function normalizeRichPageHtml(value: string) {
  const normalizedValue = normalizeWhitespace(value);

  if (!normalizedValue) {
    return "";
  }

  const candidate = /<\s*[a-z!/]/i.test(normalizedValue)
    ? normalizedValue
    : plainTextToHtml(normalizedValue);
  const normalizedMarkup = candidate
    .replace(/<\s*b\b[^>]*>/gi, "<strong>")
    .replace(/<\s*\/\s*b\s*>/gi, "</strong>")
    .replace(/<\s*i\b[^>]*>/gi, "<em>")
    .replace(/<\s*\/\s*i\s*>/gi, "</em>")
    .replace(/<\s*div\b[^>]*>/gi, "<p>")
    .replace(/<\s*\/\s*div\s*>/gi, "</p>");

  const sanitized = normalizedMarkup
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(DISALLOWED_BLOCK_TAGS, "")
    .replace(DISALLOWED_SINGLE_TAGS, "")
    .replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, rawTagName, rawAttributes) => {
      const normalizedTagName = String(rawTagName).toLowerCase();
      const isClosingTag = /^<\s*\//.test(match);

      return sanitizeTag(normalizedTagName, String(rawAttributes ?? ""), isClosingTag);
    })
    .replace(/<(p|h3|h4|li|blockquote)>\s*(<br\s*\/?>\s*)+/gi, "<$1>")
    .replace(/(<br\s*\/?>\s*)+<\/(p|h3|h4|li|blockquote)>/gi, "</$2>")
    .replace(
      /<(p|h3|h4|li|blockquote)>(?:\s|&nbsp;|<br\s*\/?>)*<\/\1>/gi,
      "",
    )
    .replace(/(<br\s*\/?>\s*){3,}/gi, "<br /><br />")
    .trim();

  return sanitized;
}


