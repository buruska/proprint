export function sanitizeBookIsbnInput(value: string) {
  return value.replace(/[^0-9-]/g, "");
}

export function formatBookIsbn(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 13);

  if (!digits) {
    return "";
  }

  const groupSizes = [3, 3, 3, 3, 1];
  const parts: string[] = [];
  let cursor = 0;

  for (const size of groupSizes) {
    if (cursor >= digits.length) {
      break;
    }

    parts.push(digits.slice(cursor, cursor + size));
    cursor += size;
  }

  return parts.filter(Boolean).join("-");
}
