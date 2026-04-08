import { createHash, randomBytes } from "node:crypto";

import { connectToDatabase } from "@/lib/mongodb";
import { AdminInvitationModel } from "@/lib/models/admin-invitation";

export function createAdminInvitationToken() {
  return randomBytes(32).toString("hex");
}

export function hashAdminInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getValidAdminInvitationByToken(token: string) {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return null;
  }

  await connectToDatabase();

  const invitation = await AdminInvitationModel.findOne({
    tokenHash: hashAdminInvitationToken(normalizedToken),
    expiresAt: { $gt: new Date() },
  }).lean();

  return invitation;
}
