"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import imageCompression from "browser-image-compression";

import type { HandmadePageContent } from "@/lib/handmade-content";

import styles from "./admin-handmade-page-editor.module.css";

const COMPRESSIBLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_UPLOAD_SIZE = 8 * 1024 * 1024;

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

function formatUploadFileSize(sizeInBytes: number) {
  const sizeInMegabytes = sizeInBytes / (1024 * 1024);

  if (sizeInMegabytes >= 1) {
    return `${sizeInMegabytes.toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
}

async function optimizeHandmadeImageUpload(file: File) {
  if (!COMPRESSIBLE_IMAGE_TYPES.has(file.type)) {
    return {
      file,
      sizeMessage: "",
    };
  }

  const compressedFile = await imageCompression(file, {
    maxSizeMB: 2,
    maxWidthOrHeight: 2400,
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

type UploadedHandmadeImage = {
  url: string;
  message: string;
  optimizationMessage: string;
};

async function uploadHandmadeImage(file: File): Promise<UploadedHandmadeImage> {
  let uploadFile = file;
  let optimizationMessage = "";

  try {
    const optimizedUpload = await optimizeHandmadeImageUpload(file);
    uploadFile = optimizedUpload.file;
    optimizationMessage = optimizedUpload.sizeMessage;
  } catch {
    uploadFile = file;
  }

  if (uploadFile.size > MAX_IMAGE_UPLOAD_SIZE) {
    throw new Error(
      "A kiválasztott kép optimalizálás után is túl nagy. Válassz kisebb vagy jobban tömöríthető képet.",
    );
  }

  const formData = new FormData();
  formData.append("file", uploadFile);

  const response = await fetch("/api/admin/uploads/handmade-image", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string; url?: string }
    | null;

  if (!response.ok || !payload?.url) {
    throw new Error(payload?.message ?? "A galériakép feltöltése nem sikerült.");
  }

  return {
    url: payload.url,
    message: payload.message ?? "A galériakép sikeresen feltöltve.",
    optimizationMessage,
  };
}

function formatImageUploadFeedback(uploadedImage: UploadedHandmadeImage, fallbackMessage: string) {
  const successMessage = uploadedImage.message || fallbackMessage;
  return uploadedImage.optimizationMessage
    ? `${uploadedImage.optimizationMessage} ${successMessage}`
    : successMessage;
}

export function AdminHandmadePageEditor({
  initialContent,
}: {
  initialContent: HandmadePageContent;
}) {
  const [leadText, setLeadText] = useState(initialContent.leadText);
  const [galleryImageUrls, setGalleryImageUrls] = useState<string[]>(initialContent.galleryImageUrls);
  const [savedAt, setSavedAt] = useState<string | null>(initialContent.updatedAt);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const isBusy = isSaving || isUploading;

  async function saveHandmadeContent(
    nextLeadText: string,
    nextGalleryImageUrls: string[],
    successMessage: string,
  ) {
    const response = await fetch("/api/admin/handmade-content", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        leadText: nextLeadText,
        galleryImageUrls: nextGalleryImageUrls,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { message?: string; content?: HandmadePageContent }
      | null;

    if (!response.ok || !payload?.content) {
      throw new Error(payload?.message ?? "A Handmade oldal mentése nem sikerült.");
    }

    setSavedAt(payload.content.updatedAt);
    setFeedback(payload.message ?? successMessage);
    setError("");

    return payload.content;
  }

  async function handleAddImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    setFeedback("");
    setError("");
    setIsUploading(true);

    try {
      const uploadedImages: UploadedHandmadeImage[] = [];

      for (const file of files) {
        const uploadedImage = await uploadHandmadeImage(file);
        uploadedImages.push(uploadedImage);
      }

      const nextGalleryImageUrls = [
        ...galleryImageUrls,
        ...uploadedImages.map((uploadedImage) => uploadedImage.url),
      ];
      const savedContent = await saveHandmadeContent(
        leadText,
        nextGalleryImageUrls,
        files.length === 1 ? "A galériakép hozzáadva." : "A galéria képei elmentve.",
      );
      setLeadText(savedContent.leadText);
      setGalleryImageUrls(savedContent.galleryImageUrls);

      const [lastUploadedImage] = uploadedImages.slice(-1);
      setFeedback(
        files.length === 1
          ? formatImageUploadFeedback(lastUploadedImage, "A galériakép hozzáadva.")
          : `${uploadedImages.length} kép került a galériába.`,
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "A galériakép feltöltése közben hiba történt. Próbáld meg újra.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleReplaceImage(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setFeedback("");
    setError("");
    setIsUploading(true);

    try {
      const uploadedImage = await uploadHandmadeImage(file);
      const nextGalleryImageUrls = galleryImageUrls.map((imageUrl, imageIndex) =>
        imageIndex === index ? uploadedImage.url : imageUrl,
      );
      const savedContent = await saveHandmadeContent(
        leadText,
        nextGalleryImageUrls,
        "A galériakép sikeresen cserélve lett.",
      );

      setLeadText(savedContent.leadText);
      setGalleryImageUrls(savedContent.galleryImageUrls);

      setFeedback(
        formatImageUploadFeedback(uploadedImage, "A galériakép sikeresen cserélve lett."),
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "A galériakép cseréje közben hiba történt. Próbáld meg újra.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteImage(index: number) {
    setFeedback("");
    setError("");
    setIsSaving(true);

    try {
      const nextGalleryImageUrls = galleryImageUrls.filter((_, imageIndex) => imageIndex !== index);
      const savedContent = await saveHandmadeContent(
        leadText,
        nextGalleryImageUrls,
        "A kép kikerült a galériából.",
      );

      setLeadText(savedContent.leadText);
      setGalleryImageUrls(savedContent.galleryImageUrls);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "A galériakép törlése közben hiba történt. Próbáld meg újra.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMoveImage(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= galleryImageUrls.length) {
      return;
    }

    setFeedback("");
    setError("");
    setIsSaving(true);

    try {
      const nextGalleryImageUrls = [...galleryImageUrls];
      [nextGalleryImageUrls[index], nextGalleryImageUrls[targetIndex]] = [
        nextGalleryImageUrls[targetIndex],
        nextGalleryImageUrls[index],
      ];

      const savedContent = await saveHandmadeContent(
        leadText,
        nextGalleryImageUrls,
        "A képek sorrendje frissítve lett.",
      );

      setLeadText(savedContent.leadText);
      setGalleryImageUrls(savedContent.galleryImageUrls);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "A képek sorrendjének mentése közben hiba történt. Próbáld meg újra.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setError("");
    setIsSaving(true);

    try {
      const savedContent = await saveHandmadeContent(
        leadText,
        galleryImageUrls,
        "A Handmade oldal tartalma elmentve.",
      );

      setLeadText(savedContent.leadText);
      setGalleryImageUrls(savedContent.galleryImageUrls);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Hálózati hiba történt mentés közben.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="admin-card">
      <div className={`admin-card__header ${styles.header}`}>
        <div>
          <p className="eyebrow">Handmade szerkesztő</p>
          <h3>A publikus `/handmade` oldal tartalma</h3>
          <p className="admin-meta-note">
            Itt tudod szerkeszteni a bevezető szöveget és a publikus galériában megjelenő képeket.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="submit" form="handmade-page-form" disabled={isBusy}>
            {isSaving ? "Mentés folyamatban..." : "Mentés"}
          </button>
        </div>
      </div>

      <p className={styles.savedAt}>Utolsó mentés: {formatSavedAt(savedAt)}</p>

      {feedback ? <p className="admin-success-note">{feedback}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <form id="handmade-page-form" className="admin-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Publikus szöveg
          <textarea
            value={leadText}
            onChange={(event) => setLeadText(event.target.value)}
            disabled={isBusy}
            rows={8}
            className="about-editor-textarea"
          />
        </label>

        <p className="admin-meta-note">
          Ez a szöveg jelenik meg a publikus Handmade oldalon a logó alatt.
        </p>

        <div className={styles.gallerySection}>
          <div className={styles.galleryHeader}>
            <div>
              <p className={styles.sectionLabel}>Galéria képei</p>
              <label className={styles.uploadLabel}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  multiple
                  className={styles.fileInput}
                  onChange={(event) => void handleAddImages(event)}
                  disabled={isBusy}
                />
                {isUploading ? "Feltöltés folyamatban..." : "Képek feltöltése"}
              </label>
            </div>
          </div>

          {galleryImageUrls.length === 0 ? (
            <div className={styles.emptyState}>
              Még nincs feltöltött kép a Handmade galériában.
            </div>
          ) : (
            <div className={styles.galleryGrid}>
              {galleryImageUrls.map((imageUrl, index) => (
                <article key={`${imageUrl}-${index}`} className={styles.galleryCard}>
                  <div className={styles.galleryPreview}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={`Handmade galéria kép ${index + 1}.`}
                      className={styles.galleryImage}
                    />
                  </div>

                  <div className={styles.galleryCardActions}>
                    <span className={styles.imageBadge}>{index + 1}.</span>
                    <button
                      type="button"
                      className={styles.orderButton}
                      onClick={() => void handleMoveImage(index, "up")}
                      disabled={isBusy || index === 0}
                    >
                      Fel
                    </button>
                    <button
                      type="button"
                      className={styles.orderButton}
                      onClick={() => void handleMoveImage(index, "down")}
                      disabled={isBusy || index === galleryImageUrls.length - 1}
                    >
                      Le
                    </button>
                    <label className={styles.cardActionButton}>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        className={styles.fileInput}
                        onChange={(event) => void handleReplaceImage(index, event)}
                        disabled={isBusy}
                      />
                      Módosítás
                    </label>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => handleDeleteImage(index)}
                      disabled={isBusy}
                    >
                      Törlés
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
