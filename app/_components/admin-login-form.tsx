"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./admin-login-form.module.css";

const initialState = {
  email: "",
  password: "",
};

export function AdminLoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleInvalid(event: React.InvalidEvent<HTMLInputElement>) {
    const input = event.currentTarget;

    if (input.validity.valueMissing) {
      input.setCustomValidity(
        input.name === "email"
          ? "Kérjük, add meg az email címed."
          : "Kérjük, add meg a jelszavad.",
      );
      return;
    }

    if (input.validity.typeMismatch) {
      input.setCustomValidity("Kérjük, érvényes email címet adj meg.");
      return;
    }

    input.setCustomValidity("Kérjük, ellenőrizd a megadott adatot.");
  }

  function clearValidationMessage(event: React.FormEvent<HTMLInputElement>) {
    event.currentTarget.setCustomValidity("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
        callbackUrl: nextPath || "/admin",
      });

      if (!result || result.error) {
        throw new Error("A megadott email cím vagy jelszó nem megfelelő.");
      }

      router.push(result.url || nextPath || "/admin");
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "A belépés most nem sikerült. Kérjük, próbáld újra.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <label>
        Email cím
        <input
          required
          name="email"
          type="email"
          autoComplete="email"
          placeholder="pelda@proprint.hu"
          value={form.email}
          onInvalid={handleInvalid}
          onInput={clearValidationMessage}
          onChange={(event) =>
            setForm((current) => ({ ...current, email: event.target.value }))
          }
        />
      </label>

      <label>
        Jelszó
        <span className={styles.passwordField}>
          <input
            required
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Add meg a jelszavad"
            value={form.password}
            onInvalid={handleInvalid}
            onInput={clearValidationMessage}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
          />
          <button
            type="button"
            className={styles.visibilityToggle}
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className={styles.visibilityIcon}
              >
                <path
                  d="M3 5.27 18.73 21"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
                <path
                  d="M10.58 10.59A2 2 0 0 0 12 14a1.97 1.97 0 0 0 1.41-.59"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
                <path
                  d="M9.88 5.09A10.94 10.94 0 0 1 12 4.91c5 0 9.27 3.11 11 7.09a11.8 11.8 0 0 1-3.09 4.36"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
                <path
                  d="M6.61 6.61A11.84 11.84 0 0 0 1 12c1.73 4 6 7.09 11 7.09a10.88 10.88 0 0 0 4.18-.82"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className={styles.visibilityIcon}
              >
                <path
                  d="M2 12s3.64-7 10-7 10 7 10 7-3.64 7-10 7-10-7-10-7Z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            )}
          </button>
        </span>
      </label>

      <div className={styles.helpRow}>
        <span className={styles.secondaryText}>Elfelejtetted a jelszavad?</span>
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Belépés folyamatban..." : "Belépés"}
      </button>

      {feedback ? <p className="form-message">{feedback}</p> : null}
    </form>
  );
}
