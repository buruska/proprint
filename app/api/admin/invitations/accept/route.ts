import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getValidAdminInvitationByToken } from "@/lib/admin-invitation";
import { normalizeAdminRole } from "@/lib/admin-permissions";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminInvitationModel } from "@/lib/models/admin-invitation";
import { AdminUserModel } from "@/lib/models/admin-user";
import { getPasswordCriteria, isPasswordStrong } from "@/lib/password-policy";

type AcceptInvitePayload = {
  token?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as AcceptInvitePayload | null;

  const token = normalizeString(payload?.token);
  const firstName = normalizeString(payload?.firstName);
  const lastName = normalizeString(payload?.lastName);
  const password = typeof payload?.password === "string" ? payload.password : "";
  const confirmPassword =
    typeof payload?.confirmPassword === "string" ? payload.confirmPassword : "";

  if (!token) {
    return NextResponse.json(
      { message: "A meghívó token hiányzik." },
      { status: 400 },
    );
  }

  if (!firstName || !lastName) {
    return NextResponse.json(
      { message: "A vezetéknév és a keresztnév megadása kötelező." },
      { status: 400 },
    );
  }

  if (firstName.length > 60 || lastName.length > 60) {
    return NextResponse.json(
      { message: "A névmezők legfeljebb 60 karakteresek lehetnek." },
      { status: 400 },
    );
  }

  if (!password || !confirmPassword) {
    return NextResponse.json(
      { message: "A jelszómezők kitöltése kötelező." },
      { status: 400 },
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { message: "A jelszó és a megerősítés nem egyezik." },
      { status: 400 },
    );
  }

  if (!isPasswordStrong(password)) {
    return NextResponse.json(
      {
        message: "A jelszó nem felel meg a biztonsági követelményeknek.",
        criteria: getPasswordCriteria(password),
      },
      { status: 400 },
    );
  }

  const invitation = await getValidAdminInvitationByToken(token);

  if (!invitation) {
    return NextResponse.json(
      { message: "A meghívó link lejárt vagy érvénytelen." },
      { status: 410 },
    );
  }

  await connectToDatabase();

  const existingAdmin = await AdminUserModel.findOne({ email: invitation.email }).lean();

  if (existingAdmin?.isActive) {
    await AdminInvitationModel.deleteOne({ _id: invitation._id });

    return NextResponse.json(
      { message: "Ehhez az email címhez már tartozik aktív admin felhasználó." },
      { status: 409 },
    );
  }

  const passwordHash = await hash(password, 12);
  const normalizedRole = normalizeAdminRole(invitation.role, invitation.permissions);

  await AdminUserModel.findOneAndUpdate(
    { email: invitation.email },
    {
      $set: {
        firstName,
        lastName,
        email: invitation.email,
        passwordHash,
        role: normalizedRole,
        isActive: true,
      },
      $setOnInsert: {
        isProtected: false,
      },
      $unset: {
        permissions: 1,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    },
  );

  await AdminInvitationModel.deleteOne({ _id: invitation._id });

  revalidatePath("/admin/admins");

  return NextResponse.json({
    message: "A regisztráció sikerült. Most már bejelentkezhetsz az admin felületre.",
  });
}
