import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("Missing MONGODB_URI");
}

const validator = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "title",
      "author",
      "language",
      "description",
      "publicationYear",
      "publicationDate",
      "isbn",
      "pageCount",
      "keywords",
      "size",
      "price",
      "coverImageUrl",
      "status",
    ],
    additionalProperties: true,
    properties: {
      legacyId: {
        bsonType: ["null", "int", "long", "double", "decimal"],
        description: "A régi SQL adatforrás azonosítója.",
      },
      title: {
        bsonType: "string",
        description: "A könyv címe.",
      },
      author: {
        bsonType: "string",
        description: "A szerző neve.",
      },
      language: {
        bsonType: "string",
        description: "A könyv nyelve.",
      },
      description: {
        bsonType: "string",
        description: "A könyv leírása.",
      },
      publicationYear: {
        bsonType: ["null", "int", "long", "double", "decimal"],
        description: "A kiadási év.",
      },
      publicationDate: {
        bsonType: ["null", "date"],
        description: "A könyv megjelenési dátuma.",
      },
      isbn: {
        bsonType: "string",
        description: "A könyv ISBN azonosítója.",
      },
      pageCount: {
        bsonType: ["null", "int", "long", "double", "decimal"],
        description: "Az oldalszám.",
      },
      keywords: {
        bsonType: "array",
        description: "Kulcsszavak listája.",
        items: {
          bsonType: "string",
        },
      },
      size: {
        bsonType: "string",
        description: "A könyv mérete.",
      },
      widthCm: {
        bsonType: ["null", "int", "long", "double", "decimal"],
        description: "A könyv szélessége centiméterben.",
      },
      heightCm: {
        bsonType: ["null", "int", "long", "double", "decimal"],
        description: "A könyv magassága centiméterben.",
      },
      price: {
        bsonType: ["null", "int", "long", "double", "decimal"],
        description: "A könyv ára.",
      },
      coverImageUrl: {
        bsonType: "string",
        description: "A borítókép URL-je.",
      },
      status: {
        enum: ["draft", "unavailable", "preorder", "in-stock"],
        description: "A könyv admin státusza.",
      },
      createdAt: {
        bsonType: "date",
      },
      updatedAt: {
        bsonType: "date",
      },
    },
  },
};

async function ensureBooksCollection() {
  await mongoose.connect(mongoUri, {
    dbName: "proprint-db",
  });

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("Database connection is not available.");
  }

  const collectionExists = await db.listCollections({ name: "books" }).hasNext();

  if (!collectionExists) {
    await db.createCollection("books", {
      validator,
      validationLevel: "strict",
      validationAction: "error",
    });
  } else {
    await db.command({
      collMod: "books",
      validator,
      validationLevel: "strict",
      validationAction: "error",
    });
  }

  const books = db.collection("books");
  const existingIndexes = await books.indexes();
  const existingIndexNames = new Set(existingIndexes.map((index) => index.name));

  for (const indexName of ["isbn_unique_idx", "isbn_unique_non_empty_idx"]) {
    if (existingIndexNames.has(indexName)) {
      await books.dropIndex(indexName);
    }
  }

  await books.createIndex(
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
  await books.createIndex({ isbn: 1 }, { name: "isbn_idx" });
  await books.createIndex({ title: 1 }, { name: "title_idx" });
  await books.createIndex({ author: 1 }, { name: "author_idx" });
  await books.createIndex({ status: 1 }, { name: "status_idx" });

  console.log("books collection ready in proprint-db");
}

ensureBooksCollection()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

