import { hash } from "bcryptjs";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!uri) {
  throw new Error("Missing MONGODB_URI");
}

if (!email || !password) {
  throw new Error("Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD");
}

async function main() {
  await mongoose.connect(uri, {
    dbName: "proprint-db",
  });

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hash(password, 12);

  const collection = mongoose.connection.collection("adminusers");

  await collection.updateOne(
    { email: normalizedEmail },
    {
      $set: {
        firstName: "",
        lastName: "",
        email: normalizedEmail,
        passwordHash,
        role: "superadmin",
        isActive: true,
        isProtected: true,
      },
      $unset: {
        name: "",
      },
    },
    {
      upsert: true,
    },
  );

  console.log("Superadmin ready:", normalizedEmail);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Superadmin seed failed.");
  console.error(error);
  process.exit(1);
});
