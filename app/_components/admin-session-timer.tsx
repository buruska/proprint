"use client";

import { signOut } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";

import styles from "./admin-shell.module.css";

const INACTIVITY_MS = 10 * 60 * 1000;
const RESET_THROTTLE_MS = 750;
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "click",
  "keydown",
  "mousemove",
  "scroll",
  "touchstart",
];

function formatRemainingTime(remainingMs: number) {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export function AdminSessionTimer() {
  const deadlineRef = useRef(0);
  const lastResetRef = useRef(0);
  const isSigningOutRef = useRef(false);
  const [remainingMs, setRemainingMs] = useState(INACTIVITY_MS);

  useEffect(() => {
    deadlineRef.current = Date.now() + INACTIVITY_MS;

    function resetTimer() {
      const now = Date.now();

      if (now - lastResetRef.current < RESET_THROTTLE_MS) {
        return;
      }

      lastResetRef.current = now;
      deadlineRef.current = now + INACTIVITY_MS;
      setRemainingMs(INACTIVITY_MS);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        resetTimer();
      }
    }

    const interval = window.setInterval(() => {
      const nextRemainingMs = Math.max(0, deadlineRef.current - Date.now());
      setRemainingMs(nextRemainingMs);

      if (nextRemainingMs === 0 && !isSigningOutRef.current) {
        isSigningOutRef.current = true;
        void signOut({ callbackUrl: "/admin/login" });
      }
    }, 1000);

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const formattedTime = useMemo(
    () => formatRemainingTime(remainingMs),
    [remainingMs],
  );

  return (
    <p className={styles.sidebarTimer}>
      Automatikus kijelentkezés: <strong>{formattedTime}</strong>
    </p>
  );
}
