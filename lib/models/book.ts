import { model, models, Schema, type InferSchemaType } from "mongoose";

import { BOOK_STATUS_VALUES } from "@/lib/book-status";
import { BOOK_LANGUAGE_VALUES } from "@/lib/book-language";

const bookSchema = new Schema(
  {
    legacyId: {
      type: Number,
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      trim: true,
      default: "",
    },
    language: {
      type: String,
      trim: true,
      enum: ["", ...BOOK_LANGUAGE_VALUES],
      default: "magyar",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    publicationYear: {
      type: Number,
      default: null,
    },
    publicationDate: {
      type: Date,
      default: null,
    },
    isbn: {
      type: String,
      trim: true,
      default: "",
    },
    pageCount: {
      type: Number,
      default: null,
    },
    keywords: {
      type: [String],
      default: [],
    },
    size: {
      type: String,
      trim: true,
      default: "",
    },
    widthCm: {
      type: Number,
      default: null,
    },
    heightCm: {
      type: Number,
      default: null,
    },
    price: {
      type: Number,
      default: null,
    },
    coverImageUrl: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: BOOK_STATUS_VALUES,
      required: true,
      default: "draft",
    },
  },
  {
    timestamps: true,
  },
);

bookSchema.index({ legacyId: 1 }, { unique: true, sparse: true });
bookSchema.index({ isbn: 1 });
bookSchema.index({ title: 1 });
bookSchema.index({ author: 1 });
bookSchema.index({ status: 1 });

export type BookDocument = InferSchemaType<typeof bookSchema>;

export const BookModel = models.Book || model("Book", bookSchema);



