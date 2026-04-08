import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI in environment");
}

async function main() {
  await mongoose.connect(uri, {
    dbName: "proprint-db",
  });

  const db = mongoose.connection.db;

  await db.collection("_init").updateOne(
    { key: "database" },
    {
      $set: {
        key: "database",
        name: "proprint-db",
        initializedAt: new Date(),
      },
    },
    { upsert: true },
  );

  const collections = await db.listCollections().toArray();

  console.log("Connected to database:", db.databaseName);
  console.log(
    "Collections:",
    collections.map((collection) => collection.name).join(", "),
  );

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Database initialization failed.");
  console.error(error);
  process.exit(1);
});
