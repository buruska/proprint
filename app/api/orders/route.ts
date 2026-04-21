import { randomBytes } from "crypto";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { BOOK_STATUS_VALUES, type BookStatus } from "@/lib/book-status";
import { getOrderNotificationRecipients, sendEmail } from "@/lib/email";
import { connectToDatabase } from "@/lib/mongodb";
import { OrderModel } from "@/lib/models/order";

type OrderItemPayload = {
  id?: unknown;
  title?: unknown;
  author?: unknown;
  price?: unknown;
  quantity?: unknown;
  status?: unknown;
};

type OrderPayload = {
  customer?: {
    name?: unknown;
    shippingAddress?: unknown;
    phone?: unknown;
    email?: unknown;
  };
  items?: unknown;
};

type NormalizedOrderItem = {
  bookId: string;
  title: string;
  author: string;
  price: number;
  quantity: number;
  status: Extract<BookStatus, "in-stock" | "preorder">;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isNonNegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatDateSegment(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Bucharest",
  }).format(date);
}

function formatOrderItemLine(item: NormalizedOrderItem) {
  const parts = [item.author.trim(), item.title.trim()].filter(Boolean);
  const label = parts.join(": ") || "Cím nélküli tétel";
  const statusLabel = item.status === "in-stock" ? "Rendelhető" : "Előrendelhető";

  return `${item.quantity} db - ${label} - ${item.price} lej - ${statusLabel}`;
}

function buildAdminEmailText(params: {
  orderNumber: string;
  orderedAt: Date;
  customerName: string;
  shippingAddress: string;
  phone: string;
  email: string;
  items: NormalizedOrderItem[];
  status: string;
}) {
  const itemLines = params.items.map(formatOrderItemLine).join("\n");

  return [
    "Új rendelés érkezett.",
    "",
    `Rendelési szám: ${params.orderNumber}`,
    `Rendelés ideje: ${formatDateTime(params.orderedAt)}`,
    `Státusz: ${params.status}`,
    "",
    "Rendelő adatai:",
    `Név: ${params.customerName}`,
    `Postázási cím: ${params.shippingAddress}`,
    `Telefonszám: ${params.phone}`,
    `E-mail: ${params.email}`,
    "",
    "Tételek:",
    itemLines,
  ].join("\n");
}

function buildAdminEmailHtml(params: {
  orderNumber: string;
  orderedAt: Date;
  customerName: string;
  shippingAddress: string;
  phone: string;
  email: string;
  items: NormalizedOrderItem[];
  status: string;
}) {
  const itemLines = params.items
    .map((item) => `<li>${formatOrderItemLine(item)}</li>`)
    .join("");

  return `
    <h1>Új rendelés érkezett</h1>
    <p><strong>Rendelési szám:</strong> ${params.orderNumber}</p>
    <p><strong>Rendelés ideje:</strong> ${formatDateTime(params.orderedAt)}</p>
    <p><strong>Státusz:</strong> ${params.status}</p>
    <h2>Rendelő adatai</h2>
    <p><strong>Név:</strong> ${params.customerName}</p>
    <p><strong>Postázási cím:</strong> ${params.shippingAddress}</p>
    <p><strong>Telefonszám:</strong> ${params.phone}</p>
    <p><strong>E-mail:</strong> ${params.email}</p>
    <h2>Tételek</h2>
    <ul>${itemLines}</ul>
  `;
}

function buildCustomerEmailText(params: { name: string; orderNumber: string }) {
  return [
    `Kedves ${params.name}!`,
    "",
    "Rendelését rögzítettük.",
    "Kollégánk hamarosan felveszi Önnel a kapcsolatot.",
    `Rendelési szám: ${params.orderNumber}`,
  ].join("\n");
}

function buildCustomerEmailHtml(params: { name: string; orderNumber: string }) {
  return `
    <p>Kedves ${params.name}!</p>
    <p>Rendelését rögzítettük.</p>
    <p>Kollégánk hamarosan felveszi Önnel a kapcsolatot.</p>
    <p><strong>Rendelési szám:</strong> ${params.orderNumber}</p>
  `;
}

async function generateOrderNumber() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const now = new Date();
    const candidate = `PP-${formatDateSegment(now)}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const existingOrder = await OrderModel.exists({ orderNumber: candidate });

    if (!existingOrder) {
      return candidate;
    }
  }

  throw new Error("Nem sikerült egyedi rendelési számot létrehozni.");
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as OrderPayload | null;

  if (!payload || !payload.customer || !Array.isArray(payload.items)) {
    return NextResponse.json(
      { message: "A rendelési adatok nem értelmezhetők." },
      { status: 400 },
    );
  }

  const customerName = normalizeString(payload.customer.name);
  const shippingAddress = normalizeString(payload.customer.shippingAddress);
  const phone = normalizeString(payload.customer.phone);
  const email = normalizeString(payload.customer.email).toLowerCase();

  if (!customerName || !shippingAddress || !phone || !email) {
    return NextResponse.json(
      { message: "Kérlek tölts ki minden kötelező mezőt." },
      { status: 400 },
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { message: "Az e-mail cím formátuma érvénytelen." },
      { status: 400 },
    );
  }

  const normalizedItems = payload.items.flatMap((rawItem) => {
    const item = rawItem as OrderItemPayload;
    const bookId = normalizeString(item.id);
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const author = typeof item.author === "string" ? item.author.trim() : "";
    const status = typeof item.status === "string" ? item.status : "";

    if (
      !bookId ||
      !isNonNegativeNumber(item.price) ||
      !isPositiveInteger(item.quantity) ||
      !BOOK_STATUS_VALUES.includes(status as BookStatus) ||
      (status !== "in-stock" && status !== "preorder")
    ) {
      return [];
    }

    return [{
      bookId,
      title,
      author,
      price: item.price as number,
      quantity: item.quantity as number,
      status: status as Extract<BookStatus, "in-stock" | "preorder">,
    }];
  });

  if (normalizedItems.length === 0 || normalizedItems.length !== payload.items.length) {
    return NextResponse.json(
      { message: "A rendelés tételei érvénytelenek." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const orderNumber = await generateOrderNumber();
  const orderedAt = new Date();
  const status = "Feldolgozás alatt";

  await OrderModel.create({
    orderNumber,
    customerName,
    shippingAddress,
    phone,
    email,
    items: normalizedItems,
    orderedAt,
    status,
  });

  let responseMessage = "A rendelés sikeresen rögzítve lett.";
  let emailDeliveryStatus: "sent" | "failed" = "sent";

  try {
    await Promise.all([
      sendEmail({
        to: getOrderNotificationRecipients(),
        subject: `Új rendelés érkezett - ${orderNumber}`,
        text: buildAdminEmailText({
          orderNumber,
          orderedAt,
          customerName,
          shippingAddress,
          phone,
          email,
          items: normalizedItems,
          status,
        }),
        html: buildAdminEmailHtml({
          orderNumber,
          orderedAt,
          customerName,
          shippingAddress,
          phone,
          email,
          items: normalizedItems,
          status,
        }),
      }),
      sendEmail({
        to: email,
        subject: `Rendelését rögzítettük - ${orderNumber}`,
        text: buildCustomerEmailText({ name: customerName, orderNumber }),
        html: buildCustomerEmailHtml({ name: customerName, orderNumber }),
      }),
    ]);
  } catch (error) {
    console.error("Order emails failed to send", error);
    responseMessage =
      "A rendelést rögzítettük, de az email értesítések küldése nem sikerült.";
    emailDeliveryStatus = "failed";
  }

  revalidatePath("/admin/orders");

  return NextResponse.json(
    {
      message: responseMessage,
      orderNumber,
      orderedAt: orderedAt.toISOString(),
      status,
      emailDeliveryStatus,
    },
    { status: 201 },
  );
}
