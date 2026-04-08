import { model, models, Schema, type InferSchemaType } from "mongoose";

import { BOOK_STATUS_VALUES } from "@/lib/book-status";
import { ORDER_STATUS_VALUES } from "@/lib/order-status";

const orderItemSchema = new Schema(
  {
    bookId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    author: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: BOOK_STATUS_VALUES,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const orderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    shippingAddress: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (value: unknown[]) => Array.isArray(value) && value.length > 0,
        message: "Legalább egy tétel szükséges a rendeléshez.",
      },
    },
    orderedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ORDER_STATUS_VALUES,
      required: true,
      default: "Feldolgozás alatt",
    },
  },
  {
    timestamps: true,
  },
);

orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ orderedAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ email: 1 });

export type OrderDocument = InferSchemaType<typeof orderSchema>;

export const OrderModel = models.Order || model("Order", orderSchema);
