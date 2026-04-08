import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAuthenticatedAdminWithPermission } from "@/lib/admin-auth";


import { connectToDatabase } from "@/lib/mongodb";
import { AdminUserModel } from "@/lib/models/admin-user";

export async function PATCH(request: Request) {
  const access = await getAuthenticatedAdminWithPermission();

  if (access.status === "unauthenticated") {
    return NextResponse.json(
      { message: "A művelethez be kell jelentkezned." },
      { status: 401 },
    );
  }

  const payload = (await request.json()) as {
    firstName?: string;
    lastName?: string;
  };

  const firstName = payload.firstName?.trim() ?? "";
  const lastName = payload.lastName?.trim() ?? "";

  if (firstName.length > 60 || lastName.length > 60) {
    return NextResponse.json(
      { message: "A névmezők legfeljebb 60 karakteresek lehetnek." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const admin = await AdminUserModel.findOneAndUpdate(
    {
      email: access.admin.email,
      isActive: true,
    },
    {
      $set: {
        firstName,
        lastName,
      },
    },
    {
      returnDocument: "after",
    },
  ).lean();

  if (!admin) {
    return NextResponse.json(
      { message: "Az admin felhasználó nem található." },
      { status: 404 },
    );
  }

  revalidatePath("/admin/profile");

  return NextResponse.json({
    message: "A saját adatok sikeresen frissültek.",
    profile: {
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
    },
  });
}




