"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import imageCompression from "browser-image-compression";

import styles from "./admin-services-manager.module.css";

type ServiceCard = {
  id: string;
  title: string;
  coverImageUrl: string;
  pricingText: string;
};

type ServicesPageContent = {
  cards: ServiceCard[];
  updatedAt: string | null;
};

const COMPRESSIBLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_UPLOAD_SIZE = 5 * 1024 * 1024;

function formatUploadFileSize(sizeInBytes: number) {
  const sizeInMegabytes = sizeInBytes / (1024 * 1024);

  if (sizeInMegabytes >= 1) {
    return `${sizeInMegabytes.toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
}

function formatSavedAt(value: string | null) {
  if (!value) {
    return "Még nincs mentve adatbázisba a szolgáltatások tartalma.";
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

function createServiceCardId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `service-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `service-${Date.now()}`;
}

function createEmptyCard(): ServiceCard {
  return {
    id: createServiceCardId(),
    title: "Új szolgáltatás",
    coverImageUrl: "",
    pricingText: "",
  };
}

async function optimizeServiceCoverUpload(file: File) {
  if (!COMPRESSIBLE_IMAGE_TYPES.has(file.type)) {
    return {
      file,
      sizeMessage: "",
    };
  }

  const compressedFile = await imageCompression(file, {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 2000,
    initialQuality: 0.82,
    useWebWorker: true,
    fileType: file.type,
  });

  if (compressedFile.size >= file.size) {
    return {
      file,
      sizeMessage: "",
    };
  }

  return {
    file: compressedFile,
    sizeMessage: `A kép optimalizálva lett (${formatUploadFileSize(file.size)} -> ${formatUploadFileSize(compressedFile.size)}).`,
  };
}

export function AdminServicesManager({ initialContent }: { initialContent: ServicesPageContent }) {
  const [cards, setCards] = useState<ServiceCard[]>(initialContent.cards);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialContent.updatedAt);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [uploadingCardId, setUploadingCardId] = useState<string | null>(null);
  const [uploadMessageById, setUploadMessageById] = useState<Record<string, string>>({});
  const [isSaving, startSavingTransition] = useTransition();

  function updateCard(cardId: string, field: keyof ServiceCard, value: string) {
    setCards((current) =>
      current.map((card) =>
        card.id === cardId
          ? {
              ...card,
              [field]: value,
            }
          : card,
      ),
    );

    if (feedback) {
      setFeedback("");
    }

    if (error) {
      setError("");
    }
  }

  function addCard() {
    setCards((current) => [createEmptyCard(), ...current]);
    setFeedback("");
    setError("");
  }

  function removeCard(cardId: string) {
    setCards((current) => current.filter((card) => card.id !== cardId));
    setUploadMessageById((current) => {
      const next = { ...current };
      delete next[cardId];
      return next;
    });
    if (feedback) {
      setFeedback("");
    }
    if (error) {
      setError("");
    }
  }

  function moveCard(cardId: string, direction: "up" | "down") {
    setCards((current) => {
      const index = current.findIndex((card) => card.id === cardId);

      if (index < 0) {
        return current;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });

    if (feedback) {
      setFeedback("");
    }
    if (error) {
      setError("");
    }
  }

  async function handleCoverUpload(cardId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setError("");
    setFeedback("");
    setUploadingCardId(cardId);
    setUploadMessageById((current) => ({
      ...current,
      [cardId]: "",
    }));

    try {
      let uploadFile = file;
      let optimizationMessage = "";

      try {
        const optimizedUpload = await optimizeServiceCoverUpload(file);
        uploadFile = optimizedUpload.file;
        optimizationMessage = optimizedUpload.sizeMessage;
      } catch {
        uploadFile = file;
      }

      if (uploadFile.size > MAX_IMAGE_UPLOAD_SIZE) {
        setError("A borítókép legfeljebb 5 MB méretű lehet.");
        return;
      }

      const formData = new FormData();
      formData.append("file", uploadFile);

      const response = await fetch("/api/admin/uploads/service-cover", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; url?: string }
        | null;

      if (!response.ok || !payload?.url) {
        setError(payload?.message ?? "A borítókép feltöltése nem sikerült.");
        return;
      }

      updateCard(cardId, "coverImageUrl", payload.url);
      setUploadMessageById((current) => ({
        ...current,
        [cardId]: optimizationMessage || payload.message || "A borítókép sikeresen feltöltve.",
      }));
    } catch {
      setError("A borítókép feltöltése közben hiba történt. Próbáld meg újra.");
    } finally {
      setUploadingCardId(null);
    }
  }

  function handleSave() {
    if (cards.length === 0) {
      setError("Legalább egy szolgáltatás-kártya szükséges.");
      return;
    }

    if (cards.some((card) => !card.title.trim())) {
      setError("Minden szolgáltatásnál adj meg címet.");
      return;
    }

    startSavingTransition(async () => {
      try {
        const response = await fetch("/api/admin/services", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cards }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { message?: string; content?: ServicesPageContent }
          | null;

        if (!response.ok || !payload?.content) {
          setError(payload?.message ?? "A szolgáltatások mentése nem sikerült.");
          return;
        }

        setCards(payload.content.cards);
        setUpdatedAt(payload.content.updatedAt);
        setFeedback(payload.message ?? "A szolgáltatások sikeresen mentve lettek.");
        setError("");
      } catch {
        setError("A mentés közben hiba történt. Próbáld meg újra.");
      }
    });
  }

  const isBusy = isSaving || uploadingCardId !== null;

  return (
    <div className="admin-card">
      <div className={`admin-card__header ${styles.header}`}>
        <div>
          <p className="eyebrow">Szolgáltatások</p>
          <h3>Szolgáltatás-kártyák</h3>
          <p className="admin-meta-note">
            Itt szerkesztheted a publikus szolgáltatásoldal kártyáinak címét, borítóképét,
            sorrendjét és az árak modalban megjelenő szövegét.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.addButton} onClick={addCard} disabled={isBusy}>
            Új kártya
          </button>
          <button type="button" onClick={handleSave} disabled={isBusy}>
            {isSaving ? "Mentés folyamatban..." : "Mentés"}
          </button>
        </div>
      </div>

      <p className={styles.savedAt}>Utolsó mentés: {formatSavedAt(updatedAt)}</p>

      {feedback ? <p className="admin-success-note">{feedback}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.cardList}>
        {cards.map((card, index) => {
          const uploadMessage = uploadMessageById[card.id];
          const isUploadingCurrent = uploadingCardId === card.id;

          return (
            <section key={card.id} className={styles.editorCard}>
              <div className={styles.previewColumn}>
                <div className={styles.cardToolbar}>
                  <span className={styles.orderBadge}>{index + 1}.</span>
                  <div className={styles.orderActions}>
                    <button
                      type="button"
                      className={styles.orderButton}
                      onClick={() => moveCard(card.id, "up")}
                      disabled={isBusy || index === 0}
                    >
                      Fel
                    </button>
                    <button
                      type="button"
                      className={styles.orderButton}
                      onClick={() => moveCard(card.id, "down")}
                      disabled={isBusy || index === cards.length - 1}
                    >
                      Le
                    </button>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeCard(card.id)}
                      disabled={isBusy || cards.length === 1}
                    >
                      Törlés
                    </button>
                  </div>
                </div>

                <p className={styles.sectionLabel}>Borítókép</p>
                <div className={styles.previewFrame}>
                  {card.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.coverImageUrl} alt={`${card.title} borítóképe`} className={styles.previewImage} />
                  ) : (
                    <div className={styles.previewPlaceholder}>Nincs feltöltött borítókép</div>
                  )}
                </div>

                <label className={styles.uploadLabel}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    className={styles.fileInput}
                    onChange={(event) => void handleCoverUpload(card.id, event)}
                    disabled={isBusy}
                  />
                  {isUploadingCurrent ? "Feltöltés folyamatban..." : "Borítókép feltöltése"}
                </label>

                {uploadMessage ? <p className={styles.info}>{uploadMessage}</p> : null}
              </div>

              <div className={styles.editorColumn}>
                <label className={styles.field}>
                  <span>Cím</span>
                  <input
                    type="text"
                    value={card.title}
                    onChange={(event) => updateCard(card.id, "title", event.target.value)}
                    className={styles.input}
                    disabled={isBusy}
                  />
                </label>

                <label className={styles.field}>
                  <span>Áraink modal szöveg</span>
                  <textarea
                    value={card.pricingText}
                    onChange={(event) => updateCard(card.id, "pricingText", event.target.value)}
                    className={styles.textarea}
                    placeholder="Ide kerül majd a szolgáltatás árleírása vagy egyéb szövege."
                    disabled={isBusy}
                  />
                </label>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

