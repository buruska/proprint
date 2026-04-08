import { model, models, Schema, type InferSchemaType } from "mongoose";

const pageContentSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    eyebrow: {
      type: String,
      trim: true,
      default: "",
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    bodyHtml: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);


export type PageContentDocument = InferSchemaType<typeof pageContentSchema>;

export const PageContentModel =
  models.PageContent || model("PageContent", pageContentSchema);

