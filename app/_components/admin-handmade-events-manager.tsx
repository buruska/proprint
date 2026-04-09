"use client";

import { useEffect, useState, useTransition } from "react";

import { AdminHandmadeCoordinatePicker } from "./admin-handmade-coordinate-picker";
import styles from "./admin-handmade-events-manager.module.css";

type HandmadeEvent = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  coordinates: string;
  address: string;
  website: string;
};

type EventFormState = {
  name: string;
  startYear: string;
  startMonth: string;
  startDay: string;
  endYear: string;
  endMonth: string;
  endDay: string;
  coordinates: string;
  address: string;
  website: string;
};

const EVENT_MONTH_OPTIONS = [
  { value: "01", label: "január" },
  { value: "02", label: "február" },
  { value: "03", label: "március" },
  { value: "04", label: "április" },
  { value: "05", label: "május" },
  { value: "06", label: "június" },
  { value: "07", label: "július" },
  { value: "08", label: "augusztus" },
  { value: "09", label: "szeptember" },
  { value: "10", label: "október" },
  { value: "11", label: "november" },
  { value: "12", label: "december" },
] as const;

const EMPTY_FORM: EventFormState = {
  name: "",
  startYear: "",
  startMonth: "",
  startDay: "",
  endYear: "",
  endMonth: "",
  endDay: "",
  coordinates: "",
  address: "",
  website: "",
};

function getDateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) {
    return {
      year: "",
      month: "",
      day: "",
    };
  }

  return {
    year: match[1],
    month: match[2],
    day: match[3],
  };
}

function createFormFromEvent(event: HandmadeEvent): EventFormState {
  const startDate = getDateParts(event.startDate);
  const endDate = getDateParts(event.endDate);

  return {
    name: event.name,
    startYear: startDate.year,
    startMonth: startDate.month,
    startDay: startDate.day,
    endYear: endDate.year,
    endMonth: endDate.month,
    endDay: endDate.day,
    coordinates: event.coordinates,
    address: event.address,
    website: event.website,
  };
}

function formatEventDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatEventDateRange(startDate: string, endDate: string) {
  const formattedStartDate = formatEventDate(startDate);
  const formattedEndDate = formatEventDate(endDate);

  if (startDate === endDate) {
    return formattedStartDate;
  }

  return `${formattedStartDate} - ${formattedEndDate}`;
}

function sortHandmadeEvents(items: HandmadeEvent[]) {
  return [...items].sort((left, right) => {
    const startDateComparison = left.startDate.localeCompare(right.startDate, "hu-HU");

    if (startDateComparison !== 0) {
      return startDateComparison;
    }

    const endDateComparison = left.endDate.localeCompare(right.endDate, "hu-HU");

    if (endDateComparison !== 0) {
      return endDateComparison;
    }

    return left.name.localeCompare(right.name, "hu-HU", {
      sensitivity: "base",
    });
  });
}

function getDaysInMonth(year: string, month: string) {
  if (!month) {
    return 31;
  }

  const numericMonth = Number(month);

  if (!Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12) {
    return 31;
  }

  if (/^\d{4}$/.test(year)) {
    return new Date(Number(year), numericMonth, 0).getDate();
  }

  if (month === "02") {
    return 29;
  }

  if (["04", "06", "09", "11"].includes(month)) {
    return 30;
  }

  return 31;
}

function buildEventDate(year: string, month: string, day: string, label: string) {
  const normalizedYear = year.trim();

  if (!/^\d{4}$/.test(normalizedYear)) {
    return {
      ok: false as const,
      message: `A ${label} évét négy számjeggyel add meg.`,
    };
  }

  const maxDay = getDaysInMonth(normalizedYear, month);
  const numericDay = Number(day);

  if (!Number.isInteger(numericDay) || numericDay < 1 || numericDay > maxDay) {
    return {
      ok: false as const,
      message: `A ${label}nál ilyen nap ebben a hónapban nincs.`,
    };
  }

  return {
    ok: true as const,
    value: `${normalizedYear}-${month}-${day}`,
  };
}

function normalizeYearInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

function getMissingFieldMessage(form: EventFormState) {
  if (!form.name.trim()) {
    return "Add meg a rendezvény nevét.";
  }

  if (!form.startYear.trim()) {
    return "Add meg a kezdő dátum évét.";
  }

  if (!form.startMonth) {
    return "Válaszd ki a kezdő dátum hónapját.";
  }

  if (!form.startDay) {
    return "Válaszd ki a kezdő dátum napját.";
  }

  if (!form.endYear.trim()) {
    return "Add meg a záró dátum évét.";
  }

  if (!form.endMonth) {
    return "Válaszd ki a záró dátum hónapját.";
  }

  if (!form.endDay) {
    return "Válaszd ki a záró dátum napját.";
  }

  if (!form.coordinates.trim()) {
    return "Jelöld ki a rendezvény helyét a térképen.";
  }

  if (!form.address.trim()) {
    return "Add meg a rendezvény címét.";
  }

  return null;
}

export function AdminHandmadeEventsManager({
  initialEvents,
}: {
  initialEvents: HandmadeEvent[];
}) {
  const [events, setEvents] = useState<HandmadeEvent[]>(() => sortHandmadeEvents(initialEvents));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isSaving, startSavingTransition] = useTransition();

  function openCreateModal() {
    setEditingEventId(null);
    setForm(EMPTY_FORM);
    setError("");
    setFeedback("");
    setIsModalOpen(true);
  }

  function openEditModal(event: HandmadeEvent) {
    setEditingEventId(event.id);
    setForm(createFormFromEvent(event));
    setError("");
    setFeedback("");
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setEditingEventId(null);
    setError("");
  }

  useEffect(() => {
    if (!isModalOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) {
        setIsModalOpen(false);
        setEditingEventId(null);
        setError("");
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen, isSaving]);

  function updateField<Key extends keyof EventFormState>(field: Key, value: EventFormState[Key]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (error) {
      setError("");
    }
  }

  function updateDateYear(prefix: "start" | "end", value: string) {
    const normalizedValue = normalizeYearInput(value);

    setForm((current) => {
      const monthField = prefix === "start" ? "startMonth" : "endMonth";
      const dayField = prefix === "start" ? "startDay" : "endDay";
      const yearField = prefix === "start" ? "startYear" : "endYear";
      const maxDay = getDaysInMonth(normalizedValue, current[monthField]);
      const nextDay = current[dayField] && Number(current[dayField]) > maxDay ? "" : current[dayField];

      return {
        ...current,
        [yearField]: normalizedValue,
        [dayField]: nextDay,
      };
    });

    if (error) {
      setError("");
    }
  }

  function updateDateMonth(prefix: "start" | "end", value: string) {
    setForm((current) => {
      const yearField = prefix === "start" ? "startYear" : "endYear";
      const monthField = prefix === "start" ? "startMonth" : "endMonth";
      const dayField = prefix === "start" ? "startDay" : "endDay";
      const maxDay = getDaysInMonth(current[yearField], value);
      const nextDay = current[dayField] && Number(current[dayField]) > maxDay ? "" : current[dayField];

      return {
        ...current,
        [monthField]: value,
        [dayField]: nextDay,
      };
    });

    if (error) {
      setError("");
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const missingFieldMessage = getMissingFieldMessage(form);

    if (missingFieldMessage) {
      setError(missingFieldMessage);
      return;
    }

    const name = form.name.trim();
    const coordinates = form.coordinates.trim();
    const address = form.address.trim();
    const website = form.website.trim();
    const startDateResult = buildEventDate(form.startYear, form.startMonth, form.startDay, "kezdő dátum");

    if (!startDateResult.ok) {
      setError(startDateResult.message);
      return;
    }

    const endDateResult = buildEventDate(form.endYear, form.endMonth, form.endDay, "záró dátum");

    if (!endDateResult.ok) {
      setError(endDateResult.message);
      return;
    }

    const startDate = startDateResult.value;
    const endDate = endDateResult.value;

    if (startDate > endDate) {
      setError("A záró dátum nem lehet korábbi, mint a kezdő dátum.");
      return;
    }

    const isEditing = Boolean(editingEventId);
    const requestUrl = isEditing
      ? `/api/admin/handmade/${editingEventId}`
      : "/api/admin/handmade";
    const requestMethod = isEditing ? "PUT" : "POST";

    startSavingTransition(async () => {
      try {
        const response = await fetch(requestUrl, {
          method: requestMethod,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            startDate,
            endDate,
            coordinates,
            address,
            website,
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { message?: string; event?: HandmadeEvent }
          | null;

        if (!response.ok) {
          setError(payload?.message ?? "A rendezvény mentése nem sikerült.");
          return;
        }

        if (!payload?.event) {
          setError("A mentés után nem érkezett vissza rendezvényadat.");
          return;
        }

        setEvents((current) => {
          if (!isEditing) {
            return sortHandmadeEvents([payload.event as HandmadeEvent, ...current]);
          }

          return sortHandmadeEvents(
            current.map((item) =>
              item.id === editingEventId ? (payload.event as HandmadeEvent) : item,
            ),
          );
        });
        setFeedback(
          payload.message ??
            (isEditing ? "A rendezvény adatai frissültek." : "A rendezvény felkerült a listára."),
        );
        setForm(EMPTY_FORM);
        setError("");
        setEditingEventId(null);
        setIsModalOpen(false);
      } catch {
        setError("A rendezvény mentése közben hiba történt. Próbáld meg újra.");
      }
    });
  }

  function handleDelete(eventToDelete: HandmadeEvent) {
    if (isSaving || deletingEventId) {
      return;
    }

    const shouldDelete = window.confirm(
      `Biztosan törölni szeretnéd ezt a rendezvényt: ${eventToDelete.name}?`,
    );

    if (!shouldDelete) {
      return;
    }

    setFeedback("");
    setError("");
    setDeletingEventId(eventToDelete.id);

    void (async () => {
      try {
        const response = await fetch(`/api/admin/handmade/${eventToDelete.id}`, {
          method: "DELETE",
        });

        const payload = (await response.json().catch(() => null)) as { message?: string } | null;

        if (!response.ok) {
          setError(payload?.message ?? "A rendezvény törlése nem sikerült.");
          return;
        }

        setEvents((current) => current.filter((item) => item.id !== eventToDelete.id));
        setFeedback(payload?.message ?? "A rendezvény törölve lett.");

        if (editingEventId === eventToDelete.id) {
          setIsModalOpen(false);
          setEditingEventId(null);
          setForm(EMPTY_FORM);
        }
      } catch {
        setError("A rendezvény törlése közben hiba történt. Próbáld meg újra.");
      } finally {
        setDeletingEventId(null);
      }
    })();
  }

  const isEditing = Boolean(editingEventId);

  return (
    <>
      <div className="admin-card">
        <div className={`admin-card__header ${styles.header}`}>
          <div>
            <p className="eyebrow">Rendezvények</p>
            <h3>Rendezvények</h3>
            <p className="admin-meta-note">
              Itt tudod felvenni, módosítani és törölni a nyilvános rendezvénylistában megjelenő eseményeket.
            </p>
          </div>

          <button type="button" className={styles.createButton} onClick={openCreateModal}>
            Új rendezvény hozzáadása
          </button>
        </div>

        {feedback ? <p className="admin-success-note">{feedback}</p> : null}
        {error && !isModalOpen ? <p className={styles.inlineError}>{error}</p> : null}

        {events.length === 0 ? (
          <p className={styles.emptyState}>Még nincs felvett rendezvény.</p>
        ) : (
          <div className={styles.eventList}>
            {events.map((item) => {
              const isDeletingCurrent = deletingEventId === item.id;

              return (
                <article key={item.id} className={styles.eventCard}>
                  <div className={styles.cardHeaderRow}>
                    <div>
                      <p className={styles.eventLabel}>Név</p>
                      <h4>{item.name}</h4>
                    </div>

                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className={styles.editButton}
                        onClick={() => openEditModal(item)}
                        disabled={isSaving || isDeletingCurrent}
                      >
                        Módosítás
                      </button>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => handleDelete(item)}
                        disabled={isSaving || isDeletingCurrent}
                      >
                        {isDeletingCurrent ? "Törlés..." : "Törlés"}
                      </button>
                    </div>
                  </div>

                  <div className={styles.eventMeta}>
                    <div>
                      <p className={styles.eventLabel}>Időpont</p>
                      <p>{formatEventDateRange(item.startDate, item.endDate)}</p>
                    </div>
                    <div>
                      <p className={styles.eventLabel}>Koordináták</p>
                      <p>{item.coordinates}</p>
                    </div>
                    <div className={styles.eventMetaWide}>
                      <p className={styles.eventLabel}>Cím</p>
                      <p>{item.address}</p>
                    </div>
                    {item.website ? (
                      <div className={styles.eventMetaWide}>
                        <p className={styles.eventLabel}>Weboldal</p>
                        <a href={item.website} target="_blank" rel="noreferrer" className={styles.websiteLink}>
                          {item.website}
                        </a>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen ? (
        <div className={styles.modalBackdrop} onClick={closeModal}>
          <div
            className={styles.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="handmade-event-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className="eyebrow">{isEditing ? "Rendezvény szerkesztése" : "Új rendezvény"}</p>
                <h3 id="handmade-event-modal-title">
                  {isEditing ? "Rendezvény módosítása" : "Rendezvény hozzáadása"}
                </h3>
              </div>

              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={closeModal}
                aria-label="Modal bezárása"
                disabled={isSaving}
              >
                Bezárás
              </button>
            </div>

            <form className={styles.modalForm} onSubmit={handleSubmit}>
              <div className={styles.modalGrid}>
                <label className={`${styles.modalField} ${styles.modalFieldWide}`}>
                  <span>Név</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    className={styles.modalInput}
                    placeholder="Például Könyvvásár 2026"
                    disabled={isSaving}
                  />
                </label>

                <div className={styles.modalField}>
                  <span>Kezdő dátum</span>
                  <div className={styles.dateFields}>
                    <label className={styles.dateSubField}>
                      <span>Év</span>
                      <input
                        suppressHydrationWarning
                        type="text"
                        inputMode="numeric"
                        placeholder="2026"
                        value={form.startYear}
                        onChange={(event) => updateDateYear("start", event.target.value)}
                        className={styles.modalInput}
                        disabled={isSaving}
                      />
                    </label>

                    <label className={styles.dateSubField}>
                      <span>Hónap</span>
                      <select
                        suppressHydrationWarning
                        value={form.startMonth}
                        onChange={(event) => updateDateMonth("start", event.target.value)}
                        className={styles.modalInput}
                        disabled={isSaving}
                      >
                        <option value="">Válassz</option>
                        {EVENT_MONTH_OPTIONS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={styles.dateSubField}>
                      <span>Nap</span>
                      <select
                        suppressHydrationWarning
                        value={form.startDay}
                        onChange={(event) => updateField("startDay", event.target.value)}
                        className={styles.modalInput}
                        disabled={isSaving || !form.startMonth}
                      >
                        <option value="">Válassz</option>
                        {Array.from(
                          { length: getDaysInMonth(form.startYear, form.startMonth) },
                          (_, index) => {
                            const dayValue = `${index + 1}`.padStart(2, "0");

                            return (
                              <option key={dayValue} value={dayValue}>
                                {index + 1}.
                              </option>
                            );
                          },
                        )}
                      </select>
                    </label>
                  </div>
                </div>

                <div className={styles.modalField}>
                  <span>Záró dátum</span>
                  <div className={styles.dateFields}>
                    <label className={styles.dateSubField}>
                      <span>Év</span>
                      <input
                        suppressHydrationWarning
                        type="text"
                        inputMode="numeric"
                        placeholder="2026"
                        value={form.endYear}
                        onChange={(event) => updateDateYear("end", event.target.value)}
                        className={styles.modalInput}
                        disabled={isSaving}
                      />
                    </label>

                    <label className={styles.dateSubField}>
                      <span>Hónap</span>
                      <select
                        suppressHydrationWarning
                        value={form.endMonth}
                        onChange={(event) => updateDateMonth("end", event.target.value)}
                        className={styles.modalInput}
                        disabled={isSaving}
                      >
                        <option value="">Válassz</option>
                        {EVENT_MONTH_OPTIONS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={styles.dateSubField}>
                      <span>Nap</span>
                      <select
                        suppressHydrationWarning
                        value={form.endDay}
                        onChange={(event) => updateField("endDay", event.target.value)}
                        className={styles.modalInput}
                        disabled={isSaving || !form.endMonth}
                      >
                        <option value="">Válassz</option>
                        {Array.from(
                          { length: getDaysInMonth(form.endYear, form.endMonth) },
                          (_, index) => {
                            const dayValue = `${index + 1}`.padStart(2, "0");

                            return (
                              <option key={dayValue} value={dayValue}>
                                {index + 1}.
                              </option>
                            );
                          },
                        )}
                      </select>
                    </label>
                  </div>
                </div>

                <div className={`${styles.modalField} ${styles.modalFieldWide} ${styles.coordinateField}`}>
                  <span>Koordináták</span>
                  <AdminHandmadeCoordinatePicker
                    value={form.coordinates}
                    onChange={(value) => updateField("coordinates", value)}
                  />
                  <input
                    type="text"
                    value={form.coordinates}
                    className={`${styles.modalInput} ${styles.coordinatePreview}`}
                    placeholder="A kiválasztott koordináta itt jelenik meg"
                    readOnly
                  />
                </div>

                <label className={`${styles.modalField} ${styles.modalFieldWide}`}>
                  <span>Cím</span>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(event) => updateField("address", event.target.value)}
                    className={styles.modalInput}
                    placeholder="Például 530232 Csíkszereda, Nagyrét u. 22 sz."
                    disabled={isSaving}
                  />
                </label>

                <label className={`${styles.modalField} ${styles.modalFieldWide}`}>
                  <span>Weboldal</span>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(event) => updateField("website", event.target.value)}
                    className={styles.modalInput}
                    placeholder="Például https://pelda.ro"
                    disabled={isSaving}
                  />
                </label>
              </div>

              {error ? <p className={styles.modalFeedback}>{error}</p> : null}

              <div className={styles.modalActions}>
                <button type="button" className={styles.modalCancelButton} onClick={closeModal} disabled={isSaving}>
                  Mégse
                </button>
                <button type="submit" className={styles.modalSaveButton} disabled={isSaving}>
                  {isSaving
                    ? "Mentés folyamatban..."
                    : isEditing
                      ? "Módosítás mentése"
                      : "Rendezvény mentése"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

