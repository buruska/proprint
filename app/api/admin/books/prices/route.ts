import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAuthenticatedAdminWithPermission } from "@/lib/admin-auth";
import mongoose from "mongoose";


import { connectToDatabase } from "@/lib/mongodb";
import { BookModel } from "@/lib/models/book";

type PriceUpdatePayload = {
  updates?: unknown;
};

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export async function PATCH(request: Request) {
  const access = await getAuthenticatedAdminWithPermission("books");

  if (access.status === "unauthenticated") {
    return NextResponse.json(
      { message: "A művelethez be kell jelentkezned." },
      { status: 401 },
    );
  }

  if (access.status === "forbidden") {
    return NextResponse.json(
      { message: "Nincs jogosultságod a könyvek kezeléséhez." },
      { status: 403 },
    );
  }

  const payload = (await request.json().catch(() => null)) as PriceUpdatePayload | null;

  if (!payload || !Array.isArray(payload.updates) || payload.updates.length === 0) {
    return NextResponse.json(
      { message: "Nincs menthető árváltozás a kérésben." },
      { status: 400 },
    );
  }

  const seenIds = new Set<string>();
  const updates = [] as Array<{ id: string; price: number | null }>;

  for (const update of payload.updates) {
    if (!update || typeof update !== "object") {
      return NextResponse.json(
        { message: "Az egyik árfrissítés formátuma érvénytelen." },
        { status: 400 },
      );
    }

    const { id, price } = update as {
      id?: unknown;
      price?: unknown;
    };

    if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Az egyik könyvazonosító érvénytelen." },
        { status: 400 },
      );
    }

    if (seenIds.has(id)) {
      return NextResponse.json(
        { message: "Ugyanaz a könyv többször szerepel a mentési kérésben." },
        { status: 400 },
      );
    }

    let normalizedPrice: number | null = null;

    if (price !== null && typeof price !== "undefined") {
      if (!isNonNegativeNumber(price)) {
        return NextResponse.json(
          { message: "Az ár csak nem negatív szám lehet." },
          { status: 400 },
        );
      }

      normalizedPrice = price;
    }

    seenIds.add(id);
    updates.push({ id, price: normalizedPrice });
  }

  await connectToDatabase();

  const existingBooks = await BookModel.find({
    _id: {
      $in: updates.map((update) => update.id),
    },
  })
    .select("_id")
    .lean();

  if (existingBooks.length !== updates.length) {
    return NextResponse.json(
      { message: "Az egyik könyv már nem található." },
      { status: 404 },
    );
  }

  await BookModel.bulkWrite(
    updates.map((update) => ({
      updateOne: {
        filter: { _id: update.id },
        update: {
          $set: {
            price: update.price,
          },
        },
      },
    })),
  );

  revalidatePath("/admin/books");
  revalidatePath("/admin/books/prices");
  revalidatePath("/books");

  return NextResponse.json({
    message:
      updates.length === 1
        ? "A könyv ára sikeresen frissült."
        : "A könyvárak sikeresen frissültek.",
  });
}






