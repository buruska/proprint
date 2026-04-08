"use client";

import { useState, useTransition } from "react";
import imageCompression from "browser-image-compression";
import { useRouter } from "next/navigation";

import {
  EBOOK_STATUS_LABELS,
  EBOOK_STATUS_VALUES,
  type EbookStatus,
} from "@/lib/ebook-status";

import styles from "./admin-ebooks-manager.module.css";

type AdminEbookItem = {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string;
  pdfUrl: string;
  epubUrl: string;
  mobiUrl: string;
  status: EbookStatus;
  statusLabel: string;
  createdAt: string;
};

type EbookFormState = {
  title: string;
  author: string;
  coverImageUrl: string;
  pdfUrl: string;
  epubUrl: string;
  mobiUrl: string;
  status: EbookStatus;
};

type EbookFileFormat = "pdf" | "epub" | "mobi";

const COMPRESSIBLE_COVER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_COVER_UPLOAD_SIZE = 5 * 1024 * 1024;

const INITIAL_FORM: EbookFormState = {
  title: "",
  author: "",
  coverImageUrl: "",
  pdfUrl: "",
  epubUrl: "",
  mobiUrl: "",
  status: "draft",
};

function formatUploadFileSize(sizeInBytes: number) {
  const sizeInMegabytes = sizeInBytes / (1024 * 1024);

  if (sizeInMegabytes >= 1) {
    return `${sizeInMegabytes.toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
}

async function optimizeCoverUpload(file: File) {
  if (!COMPRESSIBLE_COVER_TYPES.has(file.type)) {
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
    sizeMessage: `A borítókép optimalizálva lett (${formatUploadFileSize(file.size)} -> ${formatUploadFileSize(compressedFile.size)}).`,
  };
}

function formatCreatedAt(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function AdminEbooksManager({ initialEbooks }: { initialEbooks: AdminEbookItem[] }) {
  const router = useRouter();
  const [ebooks, setEbooks] = useState(initialEbooks);
  const [form, setForm] = useState<EbookFormState>(INITIAL_FORM);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [uploadingFormat, setUploadingFormat] = useState<EbookFileFormat | "">("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const isBusy = isSaving || isUploadingCover || uploadingFormat.length > 0 || isPending;

  function updateField<Key extends keyof EbookFormState>(field: Key, value: EbookFormState[Key]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCoverUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setUploadMessage("");
    setIsUploadingCover(true);

    try {
      let uploadFile = file;
      let optimizationMessage = "";

      try {
        const optimizedUpload = await optimizeCoverUpload(file);
        uploadFile = optimizedUpload.file;
        optimizationMessage = optimizedUpload.sizeMessage;
      } catch {
        uploadFile = file;
      }

      if (uploadFile.size > MAX_COVER_UPLOAD_SIZE) {
        setError("A borítókép optimalizálás után is túl nagy. Válassz kisebb vagy jobban tömöríthető képet.");
        return;
      }

      const formData = new FormData();
      formData.append("file", uploadFile);

      const response = await fetch("/api/admin/uploads/book-cover", {
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

      updateField("coverImageUrl", payload.url);
      setUploadMessage(
        optimizationMessage
          ? `${optimizationMessage} A borítókép sikeresen feltöltve.`
          : payload.message ?? "A borítókép sikeresen feltöltve.",
      );
    } catch {
      setError("Hálózati vagy képfeldolgozási hiba történt a borítókép feltöltése közben.");
    } finally {
      event.target.value = "";
      setIsUploadingCover(false);
    }
  }

  async function handleFileUpload(format: EbookFileFormat, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setUploadMessage("");
    setUploadingFormat(format);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("format", format);

      const response = await fetch("/api/admin/uploads/ebook-file", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; url?: string }
        | null;

      if (!response.ok || !payload?.url) {
        setError(payload?.message ?? "A fájl feltöltése nem sikerült.");
        return;
      }

      if (format === "pdf") {
        updateField("pdfUrl", payload.url);
      }

      if (format === "epub") {
        updateField("epubUrl", payload.url);
      }

      if (format === "mobi") {
        updateField("mobiUrl", payload.url);
      }

      setUploadMessage(payload.message ?? "A fájl sikeresen feltöltve.");
    } catch {
      setError("Hálózati hiba történt a fájl feltöltése közben.");
    } finally {
      event.target.value = "";
      setUploadingFormat("");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = form.title.trim();

    if (!trimmedTitle) {
      setError("Az e-könyv címe kötelező.");
      return;
    }

    if (!form.coverImageUrl.trim()) {
      setError("Tölts fel borítóképet az e-könyvhöz.");
      return;
    }

    if (!form.pdfUrl.trim() || !form.epubUrl.trim() || !form.mobiUrl.trim()) {
      setError("A PDF, EPUB és MOBI fájlok feltöltése egyaránt kötelező.");
      return;
    }

    setError("");
    setFeedback("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/ebooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
          author: form.author.trim(),
          coverImageUrl: form.coverImageUrl.trim(),
          pdfUrl: form.pdfUrl.trim(),
          epubUrl: form.epubUrl.trim(),
          mobiUrl: form.mobiUrl.trim(),
          status: form.status,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; ebook?: AdminEbookItem }
        | null;

      if (!response.ok || !payload?.ebook) {
        setError(payload?.message ?? "Az e-könyv mentése nem sikerült.");
        return;
      }

      setEbooks((current) => [payload.ebook!, ...current]);
      setForm(INITIAL_FORM);
      setUploadMessage("");
      setFeedback(payload.message ?? "Az új e-könyv sikeresen létrejött.");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("Hálózati hiba történt az e-könyv mentése közben.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.layout}>
      <div className="admin-card">
        <p className="eyebrow">E-könyvek</p>
        <h3>Új e-könyv feltöltése</h3>

        <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Cím</span>
              <input
                suppressHydrationWarning
                type="text"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                className={styles.input}
                disabled={isBusy}
                required
              />
            </label>

            <label className={styles.field}>
              <span>Szerző</span>
              <input
                suppressHydrationWarning
                type="text"
                value={form.author}
                onChange={(event) => updateField("author", event.target.value)}
                className={styles.input}
                disabled={isBusy}
              />
            </label>

            <label className={styles.field}>
              <span>Státusz</span>
              <select
                suppressHydrationWarning
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as EbookStatus)}
                className={styles.input}
                disabled={isBusy}
              >
                {EBOOK_STATUS_VALUES.map((status) => (
                  <option key={status} value={status}>
                    {EBOOK_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>

            <div className={`${styles.field} ${styles.fieldWide}`}>
              <span>Borítókép</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                onChange={(event) => {
                  void handleCoverUpload(event);
                }}
                className={`${styles.input} ${styles.fileInput}`}
                disabled={isBusy}
              />
              <span className={styles.hint}>
                A JPEG, PNG és WEBP képeket feltöltés előtt automatikusan optimalizáljuk. A végleges fájl legfeljebb 5 MB lehet.
              </span>
              {form.coverImageUrl ? (
                <div className={styles.coverPreview}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.coverImageUrl}
                    alt={form.title ? `${form.title} borító` : "E-könyv borító"}
                    className={styles.coverPreviewImage}
                  />
                </div>
              ) : null}
            </div>

            <label className={styles.field}>
              <span>PDF</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => {
                  void handleFileUpload("pdf", event);
                }}
                className={`${styles.input} ${styles.fileInput}`}
                disabled={isBusy}
              />
              <span className={styles.fileStatus}>{form.pdfUrl ? "PDF feltöltve" : "Még nincs PDF fájl"}</span>
            </label>

            <label className={styles.field}>
              <span>EPUB</span>
              <input
                type="file"
                accept="application/epub+zip,.epub"
                onChange={(event) => {
                  void handleFileUpload("epub", event);
                }}
                className={`${styles.input} ${styles.fileInput}`}
                disabled={isBusy}
              />
              <span className={styles.fileStatus}>{form.epubUrl ? "EPUB feltöltve" : "Még nincs EPUB fájl"}</span>
            </label>

            <label className={styles.field}>
              <span>MOBI</span>
              <input
                type="file"
                accept=".mobi,application/x-mobipocket-ebook"
                onChange={(event) => {
                  void handleFileUpload("mobi", event);
                }}
                className={`${styles.input} ${styles.fileInput}`}
                disabled={isBusy}
              />
              <span className={styles.fileStatus}>{form.mobiUrl ? "MOBI feltöltve" : "Még nincs MOBI fájl"}</span>
            </label>
          </div>

          {uploadingFormat ? (
            <p className={styles.info}>{`${uploadingFormat.toUpperCase()} fájl feltöltése folyamatban...`}</p>
          ) : null}
          {isUploadingCover ? <p className={styles.info}>A borítókép feltöltése folyamatban...</p> : null}
          {uploadMessage ? <p className={styles.info}>{uploadMessage}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}
          {feedback ? <p className={styles.info}>{feedback}</p> : null}

          <div className={styles.actions}>
            <button type="submit" className={styles.primaryButton} disabled={isBusy}>
              {isSaving ? "Mentés folyamatban..." : "E-könyv létrehozása"}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <p className="eyebrow">Feltöltött e-könyvek</p>
        <h3>E-könyvlista</h3>

        {ebooks.length === 0 ? (
          <p className={styles.empty}>Még nincs feltöltött e-könyv.</p>
        ) : (
          <div className={styles.list}>
            {ebooks.map((ebook) => (
              <article key={ebook.id} className={styles.card}>
                <div className={styles.coverWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ebook.coverImageUrl || "/book-placeholder.svg"}
                    alt={`${ebook.title} borító`}
                    className={styles.cover}
                  />
                </div>

                <div className={styles.meta}>
                  <p className={styles.author}>{ebook.author || "Szerző nincs megadva"}</p>
                  <h4 className={styles.title}>{ebook.title}</h4>
                  <div className={styles.details}>
                    <span>Státusz: {ebook.statusLabel}</span>
                    <span>{formatCreatedAt(ebook.createdAt)}</span>
                  </div>
                  <div className={styles.fileLinks}>
                    <a href={ebook.pdfUrl} target="_blank" rel="noreferrer" className={styles.fileLink}>PDF</a>
                    <a href={ebook.epubUrl} target="_blank" rel="noreferrer" className={styles.fileLink}>EPUB</a>
                    <a href={ebook.mobiUrl} target="_blank" rel="noreferrer" className={styles.fileLink}>MOBI</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
