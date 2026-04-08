import { model, models, Schema, type InferSchemaType } from "mongoose";

import {
  ADMIN_PERMISSION_VALUES,
  isAdminRoleValue,
} from "@/lib/admin-permissions";

const adminInvitationSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: Schema.Types.Mixed,
      default: [],
      required: true,
      validate: {
        validator: isAdminRoleValue,
        message: "A szerepkör csak superadmin vagy jogosultságlista lehet.",
      },
    },
    permissions: {
      type: [String],
      enum: ADMIN_PERMISSION_VALUES,
      default: undefined,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    invitedByEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  },
);

export type AdminInvitation = InferSchemaType<typeof adminInvitationSchema>;

export const AdminInvitationModel =
  models.AdminInvitation || model("AdminInvitation", adminInvitationSchema);
