import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI");
}

async function main() {
  await mongoose.connect(uri, {
    dbName: "proprint-db",
  });

  const collection = mongoose.connection.collection("adminusers");

  const result = await collection.updateMany(
    {},
    {
      $set: {
        firstName: "",
        lastName: "",
      },
      $unset: {
        name: "",
      },
    },
  );

  console.log(`Updated admin users: ${result.modifiedCount}`);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Admin name field migration failed.");
  console.error(error);
  process.exit(1);
});
