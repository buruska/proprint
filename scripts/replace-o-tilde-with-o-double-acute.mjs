import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("Missing MONGODB_URI");
}

function replaceInValue(value) {
  if (typeof value === "string") {
    const nextValue = value.replace(/õ/g, "ő");

    return {
      value: nextValue,
      replacements: value === nextValue ? 0 : (value.match(/õ/g) ?? []).length,
      changed: value !== nextValue,
    };
  }

  if (Array.isArray(value)) {
    let replacements = 0;
    let changed = false;

    const nextValue = value.map((item) => {
      const result = replaceInValue(item);
      replacements += result.replacements;
      changed ||= result.changed;
      return result.value;
    });

    return {
      value: changed ? nextValue : value,
      replacements,
      changed,
    };
  }

  if (value && typeof value === "object" && !(value instanceof Date) && !(value instanceof mongoose.Types.ObjectId)) {
    let replacements = 0;
    let changed = false;
    const sourceEntries = Object.entries(value);
    const nextEntries = sourceEntries.map(([key, nestedValue]) => {
      const result = replaceInValue(nestedValue);
      replacements += result.replacements;
      changed ||= result.changed;
      return [key, result.value];
    });

    return {
      value: changed ? Object.fromEntries(nextEntries) : value,
      replacements,
      changed,
    };
  }

  return {
    value,
    replacements: 0,
    changed: false,
  };
}

async function replaceTildeOInDatabase() {
  await mongoose.connect(mongoUri, {
    dbName: "proprint-db",
  });

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("Database connection is not available.");
  }

  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const summary = [];

  for (const { name } of collections) {
    const collection = db.collection(name);
    const cursor = collection.find({});
    const operations = [];
    let scanned = 0;
    let replacements = 0;

    for await (const document of cursor) {
      scanned += 1;
      const result = replaceInValue(document);

      if (!result.changed) {
        continue;
      }

      replacements += result.replacements;

      operations.push({
        replaceOne: {
          filter: { _id: document._id },
          replacement: result.value,
        },
      });
    }

    const bulkResult =
      operations.length > 0
        ? await collection.bulkWrite(operations, { ordered: false })
        : { matchedCount: 0, modifiedCount: 0 };

    summary.push({
      collection: name,
      scanned,
      updated: operations.length,
      replacements,
      matched: bulkResult.matchedCount,
      modified: bulkResult.modifiedCount,
    });
  }

  console.log(JSON.stringify(summary, null, 2));
}

replaceTildeOInDatabase()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
