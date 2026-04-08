import type { Metadata } from "next";

import { AdminBookPricesManager } from "@/app/_components/admin-book-prices-manager";
import { connectToDatabase } from "@/lib/mongodb";
import { BookModel } from "@/lib/models/book";
import { normalizeLegacyBookDisplayText } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Árak változtatása",
};

export default async function AdminBookPricesPage() {
  await connectToDatabase();

  const books = await BookModel.find({})
    .select("title author price language")
    .sort({ author: 1, title: 1 })
    .lean();

  const items = books.map((book) => {
    const normalizeDisplayText = normalizeLegacyBookDisplayText;

    return {
      id: String(book._id),
      author: normalizeDisplayText(book.author ?? ""),
      title: normalizeDisplayText(book.title ?? "Cím nélkül"),
      price: typeof book.price === "number" ? book.price : null,
    };
  });

  return <AdminBookPricesManager initialBooks={items} />;
}


