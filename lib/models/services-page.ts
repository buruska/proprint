import { model, models, Schema, type InferSchemaType } from "mongoose";

const serviceCardSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    coverImageUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    pricingText: {
      type: String,
      trim: true,
      default: "",
      maxlength: 12000,
    },
  },
  {
    _id: false,
  },
);

const servicesPageSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    cards: {
      type: [serviceCardSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export type ServicesPageDocument = InferSchemaType<typeof servicesPageSchema>;

export const ServicesPageModel =
  models.ServicesPage || model("ServicesPage", servicesPageSchema);
