"use client";

import { useState, type FormEvent } from "react";

import type { HandmadePageContent } from "@/lib/handmade-content";

function formatSavedAt(value: string | null) {
  if (!value) {
    return "Még nincs mentve adatbázisba mentett verzió.";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Az utolsó mentés ideje nem olvasható.";
  }

  return new Intl.DateTimeFormat("hu-HU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Bucharest",
  }).format(date);
}

export function AdminHandmadePageEditor({
  initialContent,
}: {
  initialContent: HandmadePageContent;
}) {
  const [leadText, setLeadText] = useState(initialContent.leadText);
  const [savedAt, setSavedAt] = useState<string | null>(initialContent.updatedAt);
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/handmade-content", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadText }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; content?: HandmadePageContent }
        | null;

      if (!response.ok || !payload?.content) {
        setFeedback(payload?.message ?? "A Handmade oldal mentése nem sikerült.");
        return;
      }

      setLeadText(payload.content.leadText);
      setSavedAt(payload.content.updatedAt);
      setFeedback(payload.message ?? "A Handmade oldal tartalma elmentve.");
    } catch {
      setFeedback("Hálózati hiba történt mentés közben.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="admin-card">
      <div className="admin-card__header admin-card__header--stack">
        <div>
          <p className="eyebrow">Handmade szerkesztő</p>
          <h3>A publikus `/handmade` oldal szövege</h3>
        </div>
        <p className="admin-meta-note">Utolsó mentés: {formatSavedAt(savedAt)}</p>
      </div>

      <form className="admin-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Publikus szöveg
          <textarea
            value={leadText}
            onChange={(event) => setLeadText(event.target.value)}
            disabled={isSaving}
            rows={8}
            className="about-editor-textarea"
          />
        </label>

        <p className="admin-meta-note">
          Ez a szöveg jelenik meg a publikus Handmade oldalon a logó alatt.
        </p>

        {feedback ? <p className="admin-success-note">{feedback}</p> : null}

        <div className="admin-form__actions">
          <button type="submit" disabled={isSaving}>
            {isSaving ? "Mentés folyamatban..." : "Mentés"}
          </button>
        </div>
      </form>
    </div>
  );
}
