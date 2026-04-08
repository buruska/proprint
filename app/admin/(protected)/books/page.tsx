import type { Metadata } from "next";

import { AdminBooksList } from "@/app/_components/admin-books-list";
import { BOOK_STATUS_VALUES, type BookStatus } from "@/lib/book-status";
import { connectToDatabase } from "@/lib/mongodb";
import { normalizeLegacyBookDisplayText, normalizeRichTextToPlainText, repairLegacyRomanianText } from "@/lib/utils";
import { BookModel } from "@/lib/models/book";

export const metadata: Metadata = {
  title: "Könyvek",
};

export default async function AdminBooksPage() {
  await connectToDatabase();

  const books = await BookModel.find({})
    .select(
      "title author language description publicationDate publicationYear isbn pageCount keywords size price coverImageUrl status",
    )
    .sort({ publicationDate: -1, title: 1 })
    .lean();

  const items = books.map((book) => {
    const normalizeDisplayText = normalizeLegacyBookDisplayText;

    return {
      id: String(book._id),
      title: normalizeDisplayText(book.title ?? "Cím nélkül"),
      author: normalizeDisplayText(book.author ?? ""),
      language: book.language ?? "",
      description: repairLegacyRomanianText(normalizeRichTextToPlainText(book.description ?? "")),
      publicationYear:
        typeof book.publicationYear === "number" ? book.publicationYear : null,
      publicationDate: book.publicationDate
        ? new Date(book.publicationDate).toISOString().slice(0, 10)
        : "",
      isbn: book.isbn ?? "",
      pageCount: typeof book.pageCount === "number" ? book.pageCount : null,
      keywords: Array.isArray(book.keywords)
        ? book.keywords
            .filter((keyword: unknown): keyword is string => typeof keyword === "string")
            .map((keyword: string) => normalizeDisplayText(keyword))
        : [],
      size: book.size ?? "",
      price: typeof book.price === "number" ? book.price : null,
      coverImageUrl: book.coverImageUrl ?? "",
      status: BOOK_STATUS_VALUES.includes(book.status as BookStatus)
        ? (book.status as BookStatus)
        : "draft",
    };
  });

  return <AdminBooksList books={items} />;
}






