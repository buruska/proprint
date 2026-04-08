import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getAuthenticatedAdminWithPermission } from "@/lib/admin-auth";
import {
  createAdminInvitationToken,
  hashAdminInvitationToken,
} from "@/lib/admin-invitation";
import {
  ADMIN_PERMISSION_LABELS,
  normalizeAdminPermissions,
} from "@/lib/admin-permissions";
import { sendEmail } from "@/lib/email";
import { connectToDatabase } from "@/lib/mongodb";
import { AdminInvitationModel } from "@/lib/models/admin-invitation";
import { AdminUserModel } from "@/lib/models/admin-user";

const INVITE_EXPIRATION_HOURS = 24;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildInviteEmailText(params: {
  inviteLink: string;
  expiresAt: Date;
  permissions: string[];
}) {
  return [
    "Admin meghívót kapott a Pro-Print Kiadó rendszeréhez.",
    "",
    "A regisztráció befejezéséhez nyissa meg az alábbi linket:",
    params.inviteLink,
    "",
    `A link eddig érvényes: ${formatDateTime(params.expiresAt)}`,
    "",
    "Engedélyezett admin menük:",
    ...params.permissions,
    "",
    "A regisztrációs oldalon erős jelszójavaslat is kérhető, és a jelszó szem ikonnal megtekinthető.",
  ].join("\n");
}

function buildInviteEmailHtml(params: {
  inviteLink: string;
  expiresAt: Date;
  permissions: string[];
}) {
  const permissionItems = params.permissions.map((permission) => `<li>${permission}</li>`).join("");

  return `
    <h1>Admin meghívó</h1>
    <p>Admin meghívót kapott a Pro-Print Kiadó rendszeréhez.</p>
    <p>
      A regisztráció befejezéséhez kattintson az alábbi linkre:<br />
      <a href="${params.inviteLink}">${params.inviteLink}</a>
    </p>
    <p><strong>A link eddig érvényes:</strong> ${formatDateTime(params.expiresAt)}</p>
    <h2>Engedélyezett admin menük</h2>
    <ul>${permissionItems}</ul>
    <p>A regisztrációs oldalon erős jelszójavaslat is kérhető, és a jelszó szem ikonnal megtekinthető.</p>
  `;
}

export async function POST(request: Request) {
  const access = await getAuthenticatedAdminWithPermission("admins");

  if (access.status === "unauthenticated") {
    return NextResponse.json(
      { message: "A művelethez be kell jelentkezned." },
      { status: 401 },
    );
  }

  if (access.status === "forbidden") {
    return NextResponse.json(
      { message: "Nincs jogosultságod admin meghívó küldésére." },
      { status: 403 },
    );
  }

  const payload = (await request.json().catch(() => null)) as {
    email?: unknown;
    permissions?: unknown;
  } | null;

  const email = normalizeString(payload?.email).toLowerCase();
  const permissions = normalizeAdminPermissions(payload?.permissions);

  if (!email) {
    return NextResponse.json(
      { message: "Az email cím megadása kötelező." },
      { status: 400 },
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { message: "Az email cím formátuma érvénytelen." },
      { status: 400 },
    );
  }

  if (permissions.length === 0) {
    return NextResponse.json(
      { message: "Legalább egy admin jogosultságot ki kell választani." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const existingAdmin = await AdminUserModel.findOne({ email, isActive: true }).lean();

  if (existingAdmin) {
    return NextResponse.json(
      { message: "Ehhez az email címhez már tartozik aktív admin felhasználó." },
      { status: 409 },
    );
  }

  const rawToken = createAdminInvitationToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRATION_HOURS * 60 * 60 * 1000);

  await AdminInvitationModel.findOneAndUpdate(
    { email },
    {
      $set: {
        role: permissions,
        tokenHash: hashAdminInvitationToken(rawToken),
        invitedByEmail: access.admin.email,
        expiresAt,
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

  const inviteLink = new URL(`/admin/register?token=${rawToken}`, request.url).toString();
  const permissionLabels = permissions.map((permission) => ADMIN_PERMISSION_LABELS[permission]);

  try {
    await sendEmail({
      to: email,
      subject: "Admin meghívó a Pro-Print Kiadó rendszeréhez",
      text: buildInviteEmailText({
        inviteLink,
        expiresAt,
        permissions: permissionLabels,
      }),
      html: buildInviteEmailHtml({
        inviteLink,
        expiresAt,
        permissions: permissionLabels,
      }),
    });
  } catch (error) {
    await AdminInvitationModel.deleteOne({ email });

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "A meghívó email kiküldése nem sikerült.",
      },
      { status: 500 },
    );
  }

  revalidatePath("/admin/admins");

  return NextResponse.json(
    {
      message: `A meghívó sikeresen elküldve a(z) ${email} címre. A link 24 óráig érvényes.`,
    },
    { status: 201 },
  );
}
