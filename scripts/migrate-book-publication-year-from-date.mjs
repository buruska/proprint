import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("Missing MONGODB_URI");
}

async function syncPublicationYearFromDate() {
  await mongoose.connect(mongoUri, {
    dbName: "proprint-db",
  });

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("Database connection is not available.");
  }

  const books = db.collection("books");

  const result = await books.updateMany(
    { publicationDate: { $type: "date" } },
    [
      {
        $set: {
          publicationYear: {
            $year: "$publicationDate",
          },
        },
      },
    ],
  );

  const withPublicationDate = await books.countDocuments({ publicationDate: { $type: "date" } });
  const withPublicationYear = await books.countDocuments({ publicationYear: { $type: "number" } });

  console.log(
    JSON.stringify(
      {
        matched: result.matchedCount,
        modified: result.modifiedCount,
        withPublicationDate,
        withPublicationYear,
      },
      null,
      2,
    ),
  );
}

syncPublicationYearFromDate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
