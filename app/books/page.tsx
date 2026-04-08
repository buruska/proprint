import type { Metadata } from "next";

import { PublicBooksGrid } from "@/app/_components/public-books-grid";
import { type BookStatus } from "@/lib/book-status";
import { EBOOK_STATUS_VALUES, type EbookStatus } from "@/lib/ebook-status";
import { BookModel } from "@/lib/models/book";
import { EbookModel } from "@/lib/models/ebook";
import { connectToDatabase } from "@/lib/mongodb";
import { normalizeLegacyBookDisplayText, normalizeRichTextToPlainText, repairLegacyRomanianText } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Könyveink",
};

export const dynamic = "force-dynamic";

const VISIBLE_BOOK_STATUSES = ["in-stock", "preorder", "unavailable"] as const;

export default async function BooksPage() {
  await connectToDatabase();

  const [books, ebooks] = await Promise.all([
    BookModel.find({
      status: { $in: VISIBLE_BOOK_STATUSES },
    })
      .select(
        "title author language description publicationDate publicationYear isbn pageCount keywords size price coverImageUrl status",
      )
      .sort({ publicationDate: -1, publicationYear: -1, title: 1 })
      .lean(),
    EbookModel.find({
      status: "published",
    })
      .select("title author coverImageUrl pdfUrl epubUrl mobiUrl status")
      .sort({ createdAt: -1, title: 1 })
      .lean(),
  ]);

  const items = books.map((book) => {
    const normalizeDisplayText = normalizeLegacyBookDisplayText;

    return {
      id: String(book._id),
      title: normalizeDisplayText(book.title ?? "Cím nélkül"),
      author: normalizeDisplayText(book.author ?? "Szerző nélkül"),
      description: repairLegacyRomanianText(normalizeRichTextToPlainText(book.description ?? "")),
      publicationYear:
        typeof book.publicationYear === "number" ? book.publicationYear : null,
      publicationDate: book.publicationDate
        ? new Date(book.publicationDate).toISOString().slice(0, 10)
        : "",
      isbn: book.isbn?.trim() || "",
      pageCount: typeof book.pageCount === "number" ? book.pageCount : null,
      keywords: Array.isArray(book.keywords)
        ? book.keywords
            .filter((keyword: unknown): keyword is string => typeof keyword === "string")
            .map((keyword: string) => normalizeDisplayText(keyword))
        : [],
      size: book.size?.trim() || "",
      price: typeof book.price === "number" ? book.price : 0,
      coverImageUrl: book.coverImageUrl?.trim() || "/book-placeholder.svg",
      status: book.status as BookStatus,
    };
  });

  const ebookItems = ebooks
    .map((ebook) => {
      const status = EBOOK_STATUS_VALUES.includes(ebook.status as EbookStatus)
        ? (ebook.status as EbookStatus)
        : "draft";

      return {
        id: String(ebook._id),
        title: normalizeLegacyBookDisplayText(ebook.title ?? "Cím nélkül"),
        author: normalizeLegacyBookDisplayText(ebook.author ?? "Szerző nélkül"),
        coverImageUrl: ebook.coverImageUrl?.trim() || "/book-placeholder.svg",
        pdfUrl: ebook.pdfUrl?.trim() || "",
        epubUrl: ebook.epubUrl?.trim() || "",
        mobiUrl: ebook.mobiUrl?.trim() || "",
        status,
      };
    })
    .filter((ebook) => ebook.status === "published");

  return (
    <section className="section">
      <div className="shell page-intro">
        <p className="eyebrow page-title-label">Könyvkatalógus</p>
        <PublicBooksGrid books={items} ebooks={ebookItems} />
      </div>
    </section>
  );
}
