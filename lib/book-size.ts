export const BOOK_SIZE_PRESET_VALUES = ["A4", "A5", "A6", "B5", "B6", "egyedi"] as const;

export type BookSizePreset = (typeof BOOK_SIZE_PRESET_VALUES)[number];

export const BOOK_SIZE_PRESET_LABELS: Record<BookSizePreset, string> = {
  A4: "A4",
  A5: "A5",
  A6: "A6",
  B5: "B5",
  B6: "B6",
  egyedi: "Egyedi",
};

export const BOOK_SIZE_PRESET_DIMENSIONS: Record<Exclude<BookSizePreset, "egyedi">, {
  width: string;
  height: string;
}> = {
  A4: { width: "21.0", height: "29.7" },
  A5: { width: "14.8", height: "21.0" },
  A6: { width: "10.5", height: "14.8" },
  B5: { width: "17.6", height: "25.0" },
  B6: { width: "12.5", height: "17.6" },
};

export function sanitizeBookSizeDimensionInput(value: string) {
  const compactValue = value.replace(/\s+/g, "").replace(/,/g, ".");
  let sanitizedValue = "";
  let hasDecimalSeparator = false;

  for (const character of compactValue) {
    if (/\d/.test(character)) {
      sanitizedValue += character;
      continue;
    }

    if (character === "." && !hasDecimalSeparator) {
      sanitizedValue = sanitizedValue ? `${sanitizedValue}.` : "0.";
      hasDecimalSeparator = true;
    }
  }

  return sanitizedValue;
}

export function normalizeBookSizeDimension(value: string) {
  const sanitized = sanitizeBookSizeDimensionInput(value);

  if (!sanitized || sanitized === "0.") {
    return "";
  }

  const numericValue = Number(sanitized);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "";
  }

  return `${numericValue}`;
}

export function getBookSizePresetDimensions(
  preset: Exclude<BookSizePreset, "egyedi">,
) {
  return BOOK_SIZE_PRESET_DIMENSIONS[preset];
}

export function getBookSizeDimensions(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return {
      widthCm: null,
      heightCm: null,
    };
  }

  const upperValue = trimmedValue.toUpperCase();

  if (["A4", "A5", "A6", "B5", "B6"].includes(upperValue)) {
    const dimensions = getBookSizePresetDimensions(
      upperValue as Exclude<BookSizePreset, "egyedi">,
    );

    return {
      widthCm: Number(dimensions.width),
      heightCm: Number(dimensions.height),
    };
  }

  const customSizeMatch = /^(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*cm$/i.exec(
    trimmedValue,
  );

  if (!customSizeMatch) {
    return {
      widthCm: null,
      heightCm: null,
    };
  }

  const normalizedWidth = normalizeBookSizeDimension(customSizeMatch[1]);
  const normalizedHeight = normalizeBookSizeDimension(customSizeMatch[2]);

  if (!normalizedWidth || !normalizedHeight) {
    return {
      widthCm: null,
      heightCm: null,
    };
  }

  return {
    widthCm: Number(normalizedWidth),
    heightCm: Number(normalizedHeight),
  };
}

export function formatCustomBookSize(width: string, height: string) {
  const normalizedWidth = normalizeBookSizeDimension(width);
  const normalizedHeight = normalizeBookSizeDimension(height);

  if (!normalizedWidth || !normalizedHeight) {
    return "";
  }

  return `${normalizedWidth} x ${normalizedHeight} cm`;
}

export function parseBookSize(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return {
      preset: "" as BookSizePreset | "",
      customWidth: "",
      customHeight: "",
    };
  }

  const upperValue = trimmedValue.toUpperCase();

  if (["A4", "A5", "A6", "B5", "B6"].includes(upperValue)) {
    const preset = upperValue as Exclude<BookSizePreset, "egyedi">;
    const dimensions = getBookSizePresetDimensions(preset);

    return {
      preset,
      customWidth: dimensions.width,
      customHeight: dimensions.height,
    };
  }

  const customSizeMatch = /^(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*cm$/i.exec(
    trimmedValue,
  );

  if (customSizeMatch) {
    return {
      preset: "egyedi" as const,
      customWidth: normalizeBookSizeDimension(customSizeMatch[1]),
      customHeight: normalizeBookSizeDimension(customSizeMatch[2]),
    };
  }

  return {
    preset: "egyedi" as const,
    customWidth: "",
    customHeight: "",
  };
}

export function normalizeBookSizeValue(value: string) {
  const parsedSize = parseBookSize(value);

  if (!parsedSize.preset) {
    return "";
  }

  if (parsedSize.preset === "egyedi") {
    return formatCustomBookSize(parsedSize.customWidth, parsedSize.customHeight);
  }

  return parsedSize.preset;
}
