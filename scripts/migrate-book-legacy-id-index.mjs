import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("Missing MONGODB_URI");
}

async function migrateBookLegacyIdIndex() {
  await mongoose.connect(mongoUri, {
    dbName: "proprint-db",
  });

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("Database connection is not available.");
  }

  const books = db.collection("books");
  const indexes = await books.indexes();
  const legacyIndexes = indexes.filter((index) => {
    const keyEntries = Object.entries(index.key ?? {});

    return keyEntries.length === 1 && keyEntries[0][0] === "legacyId" && keyEntries[0][1] === 1;
  });

  for (const index of legacyIndexes) {
    await books.dropIndex(index.name);
  }

  const result = await books.createIndex(
    { legacyId: 1 },
    {
      unique: true,
      name: "legacy_id_unique_idx",
      partialFilterExpression: {
        legacyId: {
          $type: "number",
        },
      },
    },
  );

  const refreshedIndexes = await books.indexes();

  console.log(
    JSON.stringify(
      {
        droppedIndexes: legacyIndexes.map((index) => index.name),
        createdIndex: result,
        indexes: refreshedIndexes,
      },
      null,
      2,
    ),
  );
}

migrateBookLegacyIdIndex()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

