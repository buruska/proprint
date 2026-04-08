import type { Metadata } from "next";
import { notFound } from "next/navigation";
import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import { BookModel } from "@/lib/models/book";

type PageProps = {
  params: Promise<{ bookId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { bookId } = await params;

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return {
      title: "Könyv módosítása",
    };
  }

  await connectToDatabase();

  const book = await BookModel.findById(bookId).select("title").lean();

  return {
    title: book?.title ? `${book.title} módosítása` : "Könyv módosítása",
  };
}

export default async function AdminBookEditPage({ params }: PageProps) {
  const { bookId } = await params;

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    notFound();
  }

  await connectToDatabase();

  const book = await BookModel.findById(bookId)
    .select("title author publicationYear price")
    .lean();

  if (!book) {
    notFound();
  }

  return (
    <div className="admin-card">
      <p className="eyebrow">Könyv szerkesztése</p>
      <h3>{book.title}</h3>
      <p>
        Itt fogjuk elkészíteni a könyv teljes szerkesztőfelületét. Jelenleg a
        kiválasztott rekord külön aloldalon már elérhető.
      </p>
      <p>
        Szerző: {book.author || "Nincs megadva"} | Kiadási év:{" "}
        {typeof book.publicationYear === "number"
          ? book.publicationYear
          : "Nincs megadva"} | Ár:{" "}
        {typeof book.price === "number" ? `${book.price} RON` : "Nincs megadva"}
      </p>
    </div>
  );
}
