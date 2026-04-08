import type { Metadata } from "next";

import { AdminEbooksList } from "@/app/_components/admin-ebooks-list";
import {
  EBOOK_STATUS_VALUES,
  type EbookStatus,
} from "@/lib/ebook-status";
import { connectToDatabase } from "@/lib/mongodb";
import { EbookModel } from "@/lib/models/ebook";

export const metadata: Metadata = {
  title: "E-könyvek",
};

export default async function AdminEbooksPage() {
  await connectToDatabase();

  const ebooks = await EbookModel.find({})
    .select("title author coverImageUrl pdfUrl epubUrl mobiUrl status createdAt")
    .sort({ createdAt: -1, title: 1 })
    .lean();

  const items = ebooks.map((ebook) => ({
    id: String(ebook._id),
    title: ebook.title ?? "Cím nélkül",
    author: ebook.author ?? "",
    coverImageUrl: ebook.coverImageUrl ?? "",
    pdfUrl: ebook.pdfUrl ?? "",
    epubUrl: ebook.epubUrl ?? "",
    mobiUrl: ebook.mobiUrl ?? "",
    status: EBOOK_STATUS_VALUES.includes(ebook.status as EbookStatus)
      ? (ebook.status as EbookStatus)
      : "draft",
    createdAt: ebook.createdAt ? new Date(ebook.createdAt).toISOString() : "",
  }));

  return <AdminEbooksList ebooks={items} />;
}
