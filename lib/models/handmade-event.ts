import { model, models, Schema, type InferSchemaType } from "mongoose";

const handmadeEventSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    coordinates: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    website: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
);

handmadeEventSchema.index({ startDate: 1, endDate: 1 });
handmadeEventSchema.index({ name: 1 });
handmadeEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type HandmadeEventDocument = InferSchemaType<typeof handmadeEventSchema>;

export const HandmadeEventModel =
  models.HandmadeEvent || model("HandmadeEvent", handmadeEventSchema);
