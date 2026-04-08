import type { Metadata } from "next";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

import { AdminOrdersList } from "@/app/_components/admin-orders-list";
import { getAuthenticatedAdminWithPermission } from "@/lib/admin-auth";
import { type OrderStatus, ORDER_STATUS_LABELS } from "@/lib/order-status";
import { connectToDatabase } from "@/lib/mongodb";
import { OrderModel } from "@/lib/models/order";

type NormalizedOrderItem = {
  bookId: string;
  title: string;
  author: string;
  price: number;
  quantity: number;
  status: string;
};

type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  customerName: string;
  shippingAddress: string;
  phone: string;
  email: string;
  orderedAt: string;
  status: OrderStatus;
  items: NormalizedOrderItem[];
  totalQuantity: number;
  totalPrice: number;
};

export const metadata: Metadata = {
  title: "Rendelések",
};

async function completeOrderAction(
  _previousState: { message: string },
  formData: FormData,
) {
  "use server";

  const access = await getAuthenticatedAdminWithPermission("orders");

  if (access.status !== "ok") {
    throw new Error("Nincs jogosultságod a rendelések kezeléséhez.");
  }

  const orderId = formData.get("orderId");

  if (typeof orderId !== "string" || !mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error("Érvénytelen rendelésazonosító.");
  }

  await connectToDatabase();

  await OrderModel.findByIdAndUpdate(orderId, {
    $set: {
      status: "Teljesítve",
    },
  });

  revalidatePath("/admin/orders");

  return { message: "A rendelés teljesítve lett." };
}

async function deleteOrderAction(
  _previousState: { message: string },
  formData: FormData,
) {
  "use server";

  const access = await getAuthenticatedAdminWithPermission("orders");

  if (access.status !== "ok") {
    throw new Error("Nincs jogosultságod a rendelések kezeléséhez.");
  }

  const orderId = formData.get("orderId");

  if (typeof orderId !== "string" || !mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error("Érvénytelen rendelésazonosító.");
  }

  await connectToDatabase();

  await OrderModel.findByIdAndDelete(orderId);

  revalidatePath("/admin/orders");

  return { message: "A rendelés törölve lett." };
}

export default async function AdminOrdersPage() {
  await connectToDatabase();

  const orders = await OrderModel.find({})
    .select("orderNumber customerName shippingAddress phone email items orderedAt status")
    .sort({ orderedAt: -1, createdAt: -1 });

  const items: AdminOrderListItem[] = orders.map((order) => {
    const normalizedItems: NormalizedOrderItem[] = order.items.map(
      (item: (typeof order.items)[number]) => ({
        bookId: item.bookId,
        title: item.title?.trim() || "Cím nélkül",
        author: item.author?.trim() || "Szerző nélkül",
        price: typeof item.price === "number" ? item.price : 0,
        quantity: typeof item.quantity === "number" ? item.quantity : 0,
        status: typeof item.status === "string" ? item.status : "",
      }),
    );
    const totalQuantity = normalizedItems.reduce(
      (sum: number, item: NormalizedOrderItem) => sum + item.quantity,
      0,
    );
    const totalPrice = normalizedItems.reduce(
      (sum: number, item: NormalizedOrderItem) => sum + item.price * item.quantity,
      0,
    );
    const normalizedStatus =
      typeof order.status === "string" && order.status in ORDER_STATUS_LABELS
        ? (order.status as OrderStatus)
        : "Feldolgozás alatt";

    return {
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      shippingAddress: order.shippingAddress,
      phone: order.phone,
      email: order.email,
      orderedAt: order.orderedAt.toISOString(),
      status: normalizedStatus,
      items: normalizedItems,
      totalQuantity,
      totalPrice,
    };
  });

  return (
    <AdminOrdersList
      orders={items}
      onCompleteOrder={completeOrderAction}
      onDeleteOrder={deleteOrderAction}
    />
  );
}
