"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { getPasswordCriteria } from "@/lib/password-policy";

import styles from "./admin-register-form.module.css";

type AdminRegisterFormProps = {
  token: string;
  email: string;
};

type FeedbackState = {
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

export function AdminRegisterForm({ token, email }: AdminRegisterFormProps) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  });
  const [visiblePasswords, setVisiblePasswords] = useState({
    password: false,
    confirmPassword: false,
  });
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const passwordCriteria = useMemo(
    () => getPasswordCriteria(form.password),
    [form.password],
  );
  const passwordsMatch =
    form.confirmPassword.length > 0 && form.password === form.confirmPassword;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          ...form,
        }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "A regisztráció nem sikerült.");
      }

      setFeedback({
        type: "success",
        message:
          result.message ||
          "A regisztráció sikerült. Most már bejelentkezhetsz az admin felületre.",
      });
      setIsCompleted(true);
      setForm({
        firstName: "",
        lastName: "",
        password: "",
        confirmPassword: "",
      });
      setVisiblePasswords({
        password: false,
        confirmPassword: false,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "A regisztráció nem sikerült.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function suggestPassword() {
    const suggestedPassword = generatePassword();

    setForm((current) => ({
      ...current,
      password: suggestedPassword,
      confirmPassword: suggestedPassword,
    }));
    setVisiblePasswords({
      password: true,
      confirmPassword: true,
    });
    setFeedback({
      type: "success",
      message: "Betöltöttünk egy erős jelszójavaslatot, amit igény szerint módosíthatsz.",
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
      <div className={styles.metaCard}>
        <span className={styles.metaLabel}>Meghívott email cím</span>
        <strong>{email}</strong>
      </div>

      {isCompleted ? (
        <div className={`${styles.feedback} ${styles.success}`}>
          <p>{feedback?.message}</p>
          <Link href="/admin/login" className={styles.loginLink}>
            Tovább a bejelentkezéshez
          </Link>
        </div>
      ) : (
        <form className="admin-form" onSubmit={handleSubmit}>
          <label>
            Vezetéknév
            <input
              required
              type="text"
              autoComplete="family-name"
              value={form.lastName}
              placeholder="Add meg a vezetéknevet"
              onChange={(event) =>
                setForm((current) => ({ ...current, lastName: event.target.value }))
              }
            />
          </label>

          <label>
            Keresztnév
            <input
              required
              type="text"
              autoComplete="given-name"
              value={form.firstName}
              placeholder="Add meg a keresztnevet"
              onChange={(event) =>
                setForm((current) => ({ ...current, firstName: event.target.value }))
              }
            />
          </label>

          <label>
            Jelszó
            <span className={styles.passwordField}>
              <input
                required
                type={visiblePasswords.password ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                placeholder="Adj meg egy erős jelszót"
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
              />
              <button
                type="button"
                className={styles.visibilityToggle}
                onClick={() => togglePasswordVisibility("password")}
                aria-label={visiblePasswords.password ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
                aria-pressed={visiblePasswords.password}
              >
                <EyeIcon visible={visiblePasswords.password} />
              </button>
            </span>
          </label>

          <label>
            Jelszó megerősítése
            <span className={styles.passwordField}>
              <input
                required
                type={visiblePasswords.confirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={form.confirmPassword}
                placeholder="Írd be újra a jelszót"
                onChange={(event) =>
                  setForm((current) => ({
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
            <button
              type="button"
              className={`button-secondary ${styles.suggestButton}`}
              onClick={suggestPassword}
            >
              Erős jelszó ajánlása
            </button>
            <p className={styles.passwordHint}>
              Kérhetsz automatikusan generált, erős jelszót, és a szem ikonnal meg is nézheted.
            </p>
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
                <span>A jelszó és a megerősítés egyezzen meg</span>
              </li>
            </ul>
          </div>

          <div className={styles.actionRow}>
            <button type="submit" className={`button-primary ${styles.submitButton}`} disabled={isSubmitting}>
              {isSubmitting ? "Regisztráció folyamatban..." : "Regisztráció befejezése"}
            </button>
          </div>

          {feedback ? (
            <p className={`${styles.feedback} ${styles[feedback.type]}`}>{feedback.message}</p>
          ) : null}
        </form>
      )}
    </div>
  );
}
