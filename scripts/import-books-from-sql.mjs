import fs from "node:fs/promises";
import process from "node:process";
import mongoose from "mongoose";

const sqlFilePath = process.argv[2];
const mongoUri = process.env.MONGODB_URI;

if (!sqlFilePath) {
  throw new Error("Missing SQL file path argument.");
}

if (!mongoUri) {
  throw new Error("Missing MONGODB_URI");
}

const columns = [
  "id",
  "cim_0",
  "cim_1",
  "cim_2",
  "nyelv",
  "alkoto1",
  "alkoto2",
  "alkoto3",
  "alkoto4",
  "irta",
  "leiras_0",
  "leiras_1",
  "leiras_2",
  "ar_0",
  "ar_1",
  "ar_2",
  "elfogyott",
  "akcio",
  "datum",
  "dakcio1",
  "dakcio2",
  "kategoria",
  "sorozat",
  "pageno",
  "size",
  "ISBN",
  "illust",
];

function cleanText(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function sanitizeBookTitle(value) {
  return cleanText(value)
    .replace(/(&#8222;|&#8221;|&bdquo;|&rdquo;|„|”)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseNullableNumber(value) {
  const normalized = cleanText(value).replace(/\s+/g, "");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePublicationDate(value) {
  const normalized = cleanText(value);

  if (!normalized) {
    return null;
  }

  const exactMatch = normalized.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);

  if (exactMatch) {
    const [, year, month, day] = exactMatch;
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  }

  const yearMatch = normalized.match(/^(\d{4})$/);

  if (yearMatch) {
    return new Date(`${yearMatch[1]}-01-01T00:00:00.000Z`);
  }

  return null;
}

function getPublicationYear(publicationDate) {
  if (!publicationDate) {
    return null;
  }

  return publicationDate.getUTCFullYear();
}

function parseTuple(tupleText) {
  const values = [];
  let current = "";
  let inString = false;
  let escaping = false;

  for (let index = 0; index < tupleText.length; index += 1) {
    const char = tupleText[index];

    if (inString) {
      if (escaping) {
        const escapedMap = {
          "0": "\0",
          b: "\b",
          n: "\n",
          r: "\r",
          t: "\t",
          Z: "\x1a",
          "\\": "\\",
          "'": "'",
          '"': '"',
        };

        current += escapedMap[char] ?? char;
        escaping = false;
        continue;
      }

      if (char === "\\") {
        escaping = true;
        continue;
      }

      if (char === "'") {
        inString = false;
        continue;
      }

      current += char;
      continue;
    }

    if (char === "'") {
      inString = true;
      continue;
    }

    if (char === ",") {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function extractTuples(valuesBlock) {
  const tuples = [];
  let depth = 0;
  let startIndex = -1;
  let inString = false;
  let escaping = false;

  for (let index = 0; index < valuesBlock.length; index += 1) {
    const char = valuesBlock[index];

    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === "'") {
        inString = false;
      }
      continue;
    }

    if (char === "'") {
      inString = true;
      continue;
    }

    if (char === "(") {
      if (depth === 0) {
        startIndex = index + 1;
      }
      depth += 1;
      continue;
    }

    if (char === ")") {
      depth -= 1;
      if (depth === 0 && startIndex >= 0) {
        tuples.push(valuesBlock.slice(startIndex, index));
      }
    }
  }

  return tuples;
}

function extractInsertBlocks(sql) {
  const marker = "INSERT INTO `pp_books`";
  const blocks = [];
  let searchStart = 0;

  while (true) {
    const insertIndex = sql.indexOf(marker, searchStart);

    if (insertIndex === -1) {
      break;
    }

    const valuesIndex = sql.indexOf("VALUES", insertIndex);

    if (valuesIndex === -1) {
      break;
    }

    let inString = false;
    let escaping = false;
    let statementEnd = -1;

    for (let index = valuesIndex; index < sql.length; index += 1) {
      const char = sql[index];

      if (inString) {
        if (escaping) {
          escaping = false;
        } else if (char === "\\") {
          escaping = true;
        } else if (char === "'") {
          inString = false;
        }
        continue;
      }

      if (char === "'") {
        inString = true;
        continue;
      }

      if (char === ";") {
        statementEnd = index;
        break;
      }
    }

    if (statementEnd === -1) {
      break;
    }

    blocks.push(sql.slice(valuesIndex + "VALUES".length, statementEnd));
    searchStart = statementEnd + 1;
  }

  return blocks;
}

function getBookSizeDimensions(size) {
  const trimmedSize = size.trim();

  if (!trimmedSize) {
    return {
      widthCm: null,
      heightCm: null,
    };
  }

  const presetDimensions = {
    A4: { widthCm: 21.0, heightCm: 29.7 },
    A5: { widthCm: 14.8, heightCm: 21.0 },
    A6: { widthCm: 10.5, heightCm: 14.8 },
    B5: { widthCm: 17.6, heightCm: 25.0 },
    B6: { widthCm: 12.5, heightCm: 17.6 },
  };
  const upperSize = trimmedSize.toUpperCase();

  if (upperSize in presetDimensions) {
    return presetDimensions[upperSize];
  }

  const customSizeMatch = /^(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*cm$/i.exec(
    trimmedSize,
  );

  if (!customSizeMatch) {
    return {
      widthCm: null,
      heightCm: null,
    };
  }

  const widthCm = Number(customSizeMatch[1].replace(",", "."));
  const heightCm = Number(customSizeMatch[2].replace(",", "."));

  return {
    widthCm: Number.isFinite(widthCm) ? widthCm : null,
    heightCm: Number.isFinite(heightCm) ? heightCm : null,
  };
}

function mapRow(values) {
  const row = Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""]));

  const title = sanitizeBookTitle(row.cim_0);
  const language = cleanText(row.nyelv);
  const description = [row.leiras_0, row.leiras_1, row.leiras_2]
    .map(cleanText)
    .filter(Boolean)
    .join("\n\n");
  const price = parseNullableNumber(row.ar_0);
  const publicationDate = parsePublicationDate(row.datum);
  const publicationYear = getPublicationYear(publicationDate);
  const pageCount = parseNullableNumber(row.pageno);
  const isbn = cleanText(row.ISBN);
  const size = cleanText(row.size);
  const sizeDimensions = getBookSizeDimensions(size);

  return {
    legacyId: parseNullableNumber(row.id),
    title,
    author: "",
    language,
    description,
    publicationYear,
    publicationDate,
    isbn,
    pageCount,
    keywords: [],
    size,
    widthCm: sizeDimensions.widthCm,
    heightCm: sizeDimensions.heightCm,
    price,
    coverImageUrl: "",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function importBooks() {
  const sql = await fs.readFile(sqlFilePath, "utf8");
  const insertBlocks = extractInsertBlocks(sql);

  if (insertBlocks.length === 0) {
    throw new Error("No INSERT statements found for pp_books.");
  }

  const documents = insertBlocks
    .flatMap((block) => extractTuples(block))
    .map(parseTuple)
    .map(mapRow)
    .filter((document) => document.title);

  await mongoose.connect(mongoUri, {
    dbName: "proprint-db",
  });

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("Database connection is not available.");
  }

  const books = db.collection("books");

  for (const document of documents) {
    await books.updateOne(
      { legacyId: document.legacyId },
      {
        $set: document,
        $unset: {
          uploadDate: "",
          createDate: "",
        },
      },
      { upsert: true },
    );
  }

  console.log(`Imported ${documents.length} books into proprint-db.books`);
}

importBooks()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

