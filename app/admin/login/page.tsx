import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AdminLoginForm } from "@/app/_components/admin-login-form";
import { authOptions } from "@/lib/auth-options";

import styles from "./login-page.module.css";

export const metadata: Metadata = {
  title: "Bejelentkezés",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/admin");
  }

  const params = await searchParams;
  const nextPath = params.next || "/admin";

  return (
    <section className={`section admin-section ${styles.loginSection}`}>
      <div className={`shell ${styles.loginShell}`}>
        <aside className={styles.loginAside}>
          <p className="eyebrow">Pro-Print admin</p>
          <h1>Belépés a kiadói vezérlőpultra</h1>
          <p>
            Innen kezelhetők a könyvek, az oldaltartalmak és a beérkező
            rendelések.
          </p>

          <ul className={styles.featureList}>
            <li>Könyvek és kiadványok kezelése</li>
            <li>Oldaltartalmak frissítése</li>
            <li>Rendelések áttekintése és feldolgozása</li>
          </ul>
        </aside>

        <div className={styles.loginPanel}>
          <div className={styles.loginHeader}>
            <p className="eyebrow">Biztonságos hozzáférés</p>
            <h2>Üdvözlünk</h2>
            <p>
              Jelentkezz be a kijelölt admin fiókkal, hogy folytathasd a
              munkát.
            </p>
          </div>

          <AdminLoginForm nextPath={nextPath} />

          <p className={styles.footnote}>
            Ez a felület csak jóváhagyott admin felhasználók számára érhető el.
          </p>
        </div>
      </div>
    </section>
  );
}
