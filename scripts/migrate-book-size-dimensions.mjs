import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("Missing MONGODB_URI");
}

const PRESET_DIMENSIONS = {
  A4: { widthCm: 21.0, heightCm: 29.7 },
  A5: { widthCm: 14.8, heightCm: 21.0 },
  A6: { widthCm: 10.5, heightCm: 14.8 },
  B5: { widthCm: 17.6, heightCm: 25.0 },
  B6: { widthCm: 12.5, heightCm: 17.6 },
};

function getBookSizeDimensions(size) {
  const trimmedSize = typeof size === "string" ? size.trim() : "";

  if (!trimmedSize) {
    return {
      widthCm: null,
      heightCm: null,
    };
  }

  const upperSize = trimmedSize.toUpperCase();

  if (upperSize in PRESET_DIMENSIONS) {
    return PRESET_DIMENSIONS[upperSize];
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

async function migrateBookSizeDimensions() {
  await mongoose.connect(mongoUri, {
    dbName: "proprint-db",
  });

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("Database connection is not available.");
  }

  const books = db.collection("books");
  const cursor = books.find({}, { projection: { _id: 1, size: 1, widthCm: 1, heightCm: 1 } });
  const operations = [];
  let scanned = 0;

  for await (const book of cursor) {
    scanned += 1;
    const { widthCm, heightCm } = getBookSizeDimensions(book.size ?? "");
    const currentWidth = typeof book.widthCm === "number" ? book.widthCm : null;
    const currentHeight = typeof book.heightCm === "number" ? book.heightCm : null;

    if (currentWidth === widthCm && currentHeight === heightCm) {
      continue;
    }

    operations.push({
      updateOne: {
        filter: { _id: book._id },
        update: {
          $set: {
            widthCm,
            heightCm,
          },
        },
      },
    });
  }

  const result =
    operations.length > 0
      ? await books.bulkWrite(operations, { ordered: false })
      : { matchedCount: 0, modifiedCount: 0 };

  const withWidth = await books.countDocuments({ widthCm: { $type: "number" } });
  const withHeight = await books.countDocuments({ heightCm: { $type: "number" } });

  console.log(
    JSON.stringify(
      {
        scanned,
        updated: operations.length,
        matched: result.matchedCount,
        modified: result.modifiedCount,
        withWidth,
        withHeight,
      },
      null,
      2,
    ),
  );
}

migrateBookSizeDimensions()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
