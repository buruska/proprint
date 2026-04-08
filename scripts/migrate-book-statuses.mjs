import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("Missing MONGODB_URI");
}

async function migrateBookStatuses() {
  await mongoose.connect(mongoUri, {
    dbName: "proprint-db",
  });

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("Database connection is not available.");
  }

  const books = db.collection("books");

  const result = await books.updateMany(
    {
      status: {
        $in: ["published", "archived"],
      },
    },
    [
      {
        $set: {
          status: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$status", "published"] },
                  then: "in-stock",
                },
                {
                  case: { $eq: ["$status", "archived"] },
                  then: "unavailable",
                },
              ],
              default: "$status",
            },
          },
        },
      },
    ],
  );

  const statuses = await books
    .aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ])
    .toArray();

  console.log(
    JSON.stringify(
      {
        matched: result.matchedCount,
        modified: result.modifiedCount,
        statuses,
      },
      null,
      2,
    ),
  );
}

migrateBookStatuses()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
