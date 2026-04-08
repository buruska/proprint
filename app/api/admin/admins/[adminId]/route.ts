import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { getAuthenticatedAdminWithPermission } from "@/lib/admin-auth";
import { AdminUserModel } from "@/lib/models/admin-user";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ adminId: string }> },
) {
  const access = await getAuthenticatedAdminWithPermission("admins");

  if (access.status === "unauthenticated") {
    return NextResponse.json(
      { message: "A művelethez be kell jelentkezned." },
      { status: 401 },
    );
  }

  if (access.status === "forbidden") {
    return NextResponse.json(
      { message: "Nincs jogosultságod admin felhasználó törlésére." },
      { status: 403 },
    );
  }

  const { adminId } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    return NextResponse.json(
      { message: "Érvénytelen adminazonosító." },
      { status: 400 },
    );
  }

  if (adminId === access.admin._id.toString()) {
    return NextResponse.json(
      { message: "Saját admin fiók nem törölhető." },
      { status: 400 },
    );
  }

  try {
    const deletedAdmin = await AdminUserModel.findOneAndDelete({
      _id: adminId,
      isActive: true,
    }).lean();

    if (!deletedAdmin) {
      return NextResponse.json(
        { message: "Az admin felhasználó nem található." },
        { status: 404 },
      );
    }

    revalidatePath("/admin/admins");

    return NextResponse.json({
      message: `A(z) ${deletedAdmin.email} admin fiók törölve lett.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Az admin felhasználó törlése nem sikerült.",
      },
      { status: 400 },
    );
  }
}
