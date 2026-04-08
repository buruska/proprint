"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getPasswordCriteria } from "@/lib/password-policy";

import styles from "./admin-profile-manager.module.css";

type AdminProfileManagerProps = {
  email: string;
  firstName: string;
  lastName: string;
};

type FormFeedback = {
  type: "success" | "error";
  message: string;
} | null;

const lowercase = "abcdefghjkmnpqrstuvwxyz";
const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const numbers = "23456789";
const symbols = "!@#$%^&*()-_=+[]{}?";
const allCharacters = `${lowercase}${uppercase}${numbers}${symbols}`;

function randomIndex(max: number) {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % max;
}

function pickRandom(source: string) {
  return source[randomIndex(source.length)];
}

function shuffle(values: string[]) {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function generatePassword(length = 14) {
  const characters = [
    pickRandom(lowercase),
    pickRandom(uppercase),
    pickRandom(numbers),
    pickRandom(symbols),
  ];

  while (characters.length < length) {
    characters.push(pickRandom(allCharacters));
  }

  return shuffle(characters).join("");
}

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.visibilityIcon}>
        <path d="M3 5.27 18.73 21" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M10.58 10.59A2 2 0 0 0 12 14a1.97 1.97 0 0 0 1.41-.59" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M9.88 5.09A10.94 10.94 0 0 1 12 4.91c5 0 9.27 3.11 11 7.09a11.8 11.8 0 0 1-3.09 4.36" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M6.61 6.61A11.84 11.84 0 0 0 1 12c1.73 4 6 7.09 11 7.09a10.88 10.88 0 0 0 4.18-.82" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.visibilityIcon}>
      <path d="M2 12s3.64-7 10-7 10 7 10 7-3.64 7-10 7-10-7-10-7Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function AdminProfileManager({
  email,
  firstName,
  lastName,
}: AdminProfileManagerProps) {
  const router = useRouter();
  const [profileForm, setProfileForm] = useState({ firstName, lastName });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [visiblePasswords, setVisiblePasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<FormFeedback>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<FormFeedback>(null);

  useEffect(() => {
    setProfileForm({ firstName, lastName });
  }, [firstName, lastName]);

  const passwordCriteria = getPasswordCriteria(passwordForm.newPassword);
  const passwordsMatch =
    passwordForm.confirmPassword.length > 0 &&
    passwordForm.newPassword === passwordForm.confirmPassword;

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileFeedback(null);

    try {
      const response = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileForm),
      });

      const result = (await response.json()) as {
        message?: string;
        profile?: { firstName: string; lastName: string };
      };

      if (!response.ok) {
        throw new Error(result.message || "A mentés nem sikerült.");
      }

      if (result.profile) {
        setProfileForm({
          firstName: result.profile.firstName,
          lastName: result.profile.lastName,
        });
      }

      router.refresh();
      setProfileFeedback({
        type: "success",
        message: result.message || "A saját adatok frissültek.",
      });
    } catch (error) {
      setProfileFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "A saját adatok frissítése nem sikerült.",
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingPassword(true);
    setPasswordFeedback(null);

    try {
      const response = await fetch("/api/admin/profile/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passwordForm),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "A jelszó módosítása nem sikerült.");
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      router.refresh();
      setPasswordFeedback({
        type: "success",
        message: result.message || "A jelszó sikeresen frissült.",
      });
    } catch (error) {
      setPasswordFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "A jelszó módosítása nem sikerült.",
      });
    } finally {
      setIsSavingPassword(false);
    }
  }

  function suggestPassword() {
    const suggestedPassword = generatePassword();

    setPasswordForm((current) => ({
      ...current,
      newPassword: suggestedPassword,
      confirmPassword: suggestedPassword,
    }));
    setVisiblePasswords((current) => ({
      ...current,
      newPassword: true,
      confirmPassword: true,
    }));
    setPasswordFeedback({
      type: "success",
      message: "A rendszer betöltött egy erős jelszójavaslatot az új jelszó mezőkbe.",
    });
  }

  function togglePasswordVisibility(field: keyof typeof visiblePasswords) {
    setVisiblePasswords((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }

  return (
    <div className={styles.stack}>
      <div className={styles.heroCard}>
        <p className="eyebrow">Saját adatok</p>
        <h3>Profil és biztonság</h3>
        <p>
          Itt módosíthatod a saját névadatokat, a bejelentkezéshez használt
          email fiókot pedig a rendszer változatlanul azonosító mezőként kezeli.
        </p>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Bejelentkezési email</span>
          <strong>{email}</strong>
        </div>
      </div>

      <div className={styles.grid}>
        <section className="admin-card">
          <p className="eyebrow">Névadatok</p>
          <h3>Személyes adatok</h3>
          <p>Módosítsd a vezetéknevet és a keresztnevet külön mezőkben.</p>

          <form className="admin-form" onSubmit={handleProfileSubmit}>
            <label>
              Vezetéknév
              <input
                type="text"
                value={profileForm.lastName}
                placeholder="Add meg a vezetéknevet"
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    lastName: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              Keresztnév
              <input
                type="text"
                value={profileForm.firstName}
                placeholder="Add meg a keresztnevet"
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    firstName: event.target.value,
                  }))
                }
              />
            </label>

            <div className={styles.actionRow}>
              <button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? "Mentés folyamatban..." : "Saját adatok mentése"}
              </button>
            </div>

            {profileFeedback ? (
              <p className={`${styles.feedback} ${styles[profileFeedback.type]}`}>
                {profileFeedback.message}
              </p>
            ) : null}
          </form>
        </section>

        <section className="admin-card">
          <p className="eyebrow">Jelszócsere</p>
          <h3>Biztonságos jelszó frissítése</h3>
          <p>
            Add meg a jelenlegi jelszavadat, majd válassz új jelszót a biztonsági
            szabályok alapján.
          </p>

          <form className="admin-form" onSubmit={handlePasswordSubmit}>
            <label>
              Jelenlegi jelszó
              <span className={styles.passwordField}>
                <input
                  required
                  type={visiblePasswords.currentPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={passwordForm.currentPassword}
                  placeholder="Add meg a jelenlegi jelszavad"
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  className={styles.visibilityToggle}
                  onClick={() => togglePasswordVisibility("currentPassword")}
                  aria-label={visiblePasswords.currentPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
                  aria-pressed={visiblePasswords.currentPassword}
                >
                  <EyeIcon visible={visiblePasswords.currentPassword} />
                </button>
              </span>
            </label>

            <label>
              Új jelszó
              <span className={styles.passwordField}>
                <input
                  required
                  type={visiblePasswords.newPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  placeholder="Adj meg egy erős új jelszót"
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  className={styles.visibilityToggle}
                  onClick={() => togglePasswordVisibility("newPassword")}
                  aria-label={visiblePasswords.newPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
                  aria-pressed={visiblePasswords.newPassword}
                >
                  <EyeIcon visible={visiblePasswords.newPassword} />
                </button>
              </span>
            </label>

            <label>
              Új jelszó megerősítése
              <span className={styles.passwordField}>
                <input
                  required
                  type={visiblePasswords.confirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={passwordForm.confirmPassword}
                  placeholder="Írd be újra az új jelszót"
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  className={styles.visibilityToggle}
                  onClick={() => togglePasswordVisibility("confirmPassword")}
                  aria-label={visiblePasswords.confirmPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
                  aria-pressed={visiblePasswords.confirmPassword}
                >
                  <EyeIcon visible={visiblePasswords.confirmPassword} />
                </button>
              </span>
            </label>

            <div className={styles.passwordTools}>
              <button type="button" className={`${styles.suggestButton} button-ghost`} onClick={suggestPassword}>
                Erős jelszó ajánlása
              </button>
            </div>

            <div className={styles.criteriaPanel}>
              <strong>Jelszókövetelmények</strong>
              <ul className={styles.criteriaList}>
                {passwordCriteria.map((rule) => (
                  <li key={rule.id} className={rule.met ? styles.criteriaMet : styles.criteriaPending}>
                    <span className={styles.criteriaState}>{rule.met ? "Teljesült" : "Hiányzik"}</span>
                    <span>{rule.label}</span>
                  </li>
                ))}
                <li className={passwordsMatch ? styles.criteriaMet : styles.criteriaPending}>
                  <span className={styles.criteriaState}>{passwordsMatch ? "Teljesült" : "Hiányzik"}</span>
                  <span>Az új jelszó és a megerősítés egyezzen meg</span>
                </li>
              </ul>
            </div>

            <div className={styles.actionRow}>
              <button type="submit" disabled={isSavingPassword}>
                {isSavingPassword ? "Jelszó frissítése folyamatban..." : "Jelszó módosítása"}
              </button>
            </div>

            {passwordFeedback ? (
              <p className={`${styles.feedback} ${styles[passwordFeedback.type]}`}>
                {passwordFeedback.message}
              </p>
            ) : null}
          </form>
        </section>
      </div>
    </div>
  );
}
