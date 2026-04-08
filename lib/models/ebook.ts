import { model, models, Schema, type InferSchemaType } from "mongoose";

import { EBOOK_STATUS_VALUES } from "@/lib/ebook-status";

const ebookSchema = new Schema(
  {
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
    coverImageUrl: {
      type: String,
      trim: true,
      default: "",
    },
    pdfUrl: {
      type: String,
      trim: true,
      default: "",
    },
    epubUrl: {
      type: String,
      trim: true,
      default: "",
    },
    mobiUrl: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: EBOOK_STATUS_VALUES,
      required: true,
      default: "draft",
    },
  },
  {
    timestamps: true,
  },
);

ebookSchema.index({ title: 1 });
ebookSchema.index({ author: 1 });
ebookSchema.index({ status: 1 });

export type EbookDocument = InferSchemaType<typeof ebookSchema>;

export const EbookModel = models.Ebook || model("Ebook", ebookSchema);
