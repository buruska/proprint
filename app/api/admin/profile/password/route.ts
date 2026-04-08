import { hash, compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { getAuthenticatedAdminWithPermission } from "@/lib/admin-auth";


import { connectToDatabase } from "@/lib/mongodb";
import { AdminUserModel } from "@/lib/models/admin-user";
import { getPasswordCriteria, isPasswordStrong } from "@/lib/password-policy";

export async function PATCH(request: Request) {
  const access = await getAuthenticatedAdminWithPermission();

  if (access.status === "unauthenticated") {
    return NextResponse.json(
      { message: "A művelethez be kell jelentkezned." },
      { status: 401 },
    );
  }

  const payload = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  const currentPassword = payload.currentPassword ?? "";
  const newPassword = payload.newPassword ?? "";
  const confirmPassword = payload.confirmPassword ?? "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json(
      { message: "Minden jelszómezőt ki kell tölteni." },
      { status: 400 },
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { message: "Az új jelszó és a megerősítés nem egyezik." },
      { status: 400 },
    );
  }

  if (!isPasswordStrong(newPassword)) {
    return NextResponse.json(
      {
        message: "Az új jelszó nem felel meg a biztonsági követelményeknek.",
        criteria: getPasswordCriteria(newPassword),
      },
      { status: 400 },
    );
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { message: "Az új jelszó nem egyezhet meg a jelenlegi jelszóval." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const admin = await AdminUserModel.findOne({
    email: access.admin.email,
    isActive: true,
  });

  if (!admin) {
    return NextResponse.json(
      { message: "Az admin felhasználó nem található." },
      { status: 404 },
    );
  }

  const passwordMatches = await compare(currentPassword, admin.passwordHash);

  if (!passwordMatches) {
    return NextResponse.json(
      { message: "A jelenlegi jelszó nem megfelelő." },
      { status: 400 },
    );
  }

  admin.passwordHash = await hash(newPassword, 12);
  await admin.save();

  return NextResponse.json({
    message: "A jelszó sikeresen frissült.",
  });
}




