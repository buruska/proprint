import { model, models, Schema, type InferSchemaType } from "mongoose";

import {
  ADMIN_PERMISSION_VALUES,
  isAdminRoleValue,
} from "@/lib/admin-permissions";

const adminUserSchema = new Schema(
  {
    firstName: {
      type: String,
      trim: true,
      default: "",
    },
    lastName: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
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
    isActive: {
      type: Boolean,
      default: true,
    },
    isProtected: {
      type: Boolean,
      default: false,
      immutable: true,
    },
  },
  {
    timestamps: true,
  },
);

async function rejectProtectedDeletion(
  filter: Record<string, unknown>,
  modelName: typeof AdminUserModel,
) {
  const admin = await modelName.findOne(filter).lean();

  if (admin?.isProtected) {
    throw new Error("Protected superadmin users cannot be deleted.");
  }
}

adminUserSchema.pre("findOneAndDelete", async function () {
  await rejectProtectedDeletion(this.getFilter(), AdminUserModel);
});

adminUserSchema.pre("deleteOne", { document: false, query: true }, async function () {
  await rejectProtectedDeletion(this.getFilter(), AdminUserModel);
});

adminUserSchema.pre("deleteOne", { document: true, query: false }, async function () {
  if (this.isProtected) {
    throw new Error("Protected superadmin users cannot be deleted.");
  }
});

export type AdminUser = InferSchemaType<typeof adminUserSchema>;

export const AdminUserModel =
  models.AdminUser || model("AdminUser", adminUserSchema);
