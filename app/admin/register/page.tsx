import type { Metadata } from "next";

import { AdminRegisterForm } from "@/app/_components/admin-register-form";
import { getValidAdminInvitationByToken } from "@/lib/admin-invitation";
import {
  ADMIN_PERMISSION_LABELS,
  normalizeAdminRole,
} from "@/lib/admin-permissions";

import styles from "./register-page.module.css";

export const metadata: Metadata = {
  title: "Admin regisztráció",
};

export default async function AdminRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";
  const invitation = token ? await getValidAdminInvitationByToken(token) : null;
  const role = normalizeAdminRole(invitation?.role, invitation?.permissions);
  const permissions = role === "superadmin" ? [] : role;

  return (
    <section className={`section admin-section ${styles.registerSection}`}>
      <div className={`shell ${styles.registerShell}`}>
        <aside className={styles.registerAside}>
          <p className="eyebrow">Admin meghívó</p>
          <h1>Regisztráció az admin felülethez</h1>
          <p>
            Ezen az oldalon tudod befejezni az admin fiók létrehozását a kapott
            emailes meghívó alapján.
          </p>

          {invitation ? (
            <div className={styles.permissionPanel}>
              <strong>Engedélyezett admin menük</strong>
              <ul className={styles.permissionList}>
                {permissions.map((permission) => (
                  <li key={permission}>{ADMIN_PERMISSION_LABELS[permission]}</li>
                ))}
              </ul>
              <p>
                A bejelentkezés után ezek az admin almenük jelennek majd meg a
                superadmin kivételével ennél a fióknál.
              </p>
            </div>
          ) : (
            <div className={styles.permissionPanel}>
              <strong>A meghívó nem használható</strong>
              <p>
                A link lejárt, hiányzik vagy már fel lett használva. Kérj új admin
                meghívót egy meglévő adminisztrátortól.
              </p>
            </div>
          )}
        </aside>

        <div className={styles.registerPanel}>
          <div className={styles.registerHeader}>
            <p className="eyebrow">Biztonságos regisztráció</p>
            <h2>{invitation ? "Fiók létrehozása" : "Meghívó érvénytelen"}</h2>
            <p>
              {invitation
                ? "Add meg a nevedet, kérj igény szerint erős jelszójavaslatot, és a szem ikonnal ellenőrizd a beírt jelszót az admin hozzáférés aktiválásához."
                : "Az admin meghívó jelenleg nem érvényes, ezért a regisztráció nem folytatható."}
            </p>
          </div>

          {invitation ? (
            <AdminRegisterForm token={token} email={invitation.email} />
          ) : null}
        </div>
      </div>
    </section>
  );
}
