import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("Missing MONGODB_URI");
}

function sanitizeBookTitle(value) {
  return String(value ?? "")
    .replace(/(&#8222;|&#8221;|&bdquo;|&rdquo;|„|”)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function stripTitleQuoteEntities() {
  await mongoose.connect(mongoUri, {
    dbName: "proprint-db",
  });

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("Database connection is not available.");
  }

  const books = db.collection("books");
  const cursor = books.find({
    title: /(&#8222;|&#8221;|&bdquo;|&rdquo;|„|”)/,
  });

  let matched = 0;
  let modified = 0;

  for await (const book of cursor) {
    matched += 1;
    const nextTitle = sanitizeBookTitle(book.title);

    if (nextTitle !== book.title) {
      await books.updateOne(
        { _id: book._id },
        {
          $set: {
            title: nextTitle,
          },
        },
      );
      modified += 1;
    }
  }

  const remaining = await books.countDocuments({
    title: /(&#8222;|&#8221;|&bdquo;|&rdquo;|„|”)/,
  });

  console.log(
    JSON.stringify(
      {
        matched,
        modified,
        remaining,
      },
      null,
      2,
    ),
  );
}

stripTitleQuoteEntities()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
