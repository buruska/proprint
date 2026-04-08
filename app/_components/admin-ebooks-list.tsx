"use client";

import { useEffect, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import imageCompression from "browser-image-compression";
import { useRouter } from "next/navigation";

import {
  EBOOK_STATUS_LABELS,
  EBOOK_STATUS_VALUES,
  type EbookStatus,
} from "@/lib/ebook-status";

import styles from "./admin-ebooks-manager.module.css";

type AdminEbookListItem = {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string;
  pdfUrl: string;
  epubUrl: string;
  mobiUrl: string;
  status: EbookStatus;
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
const NEW_EBOOK_ID = "__new__";
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

function sortAdminEbooks(items: AdminEbookListItem[]) {
  return [...items].sort((left, right) => {
    const createdAtComparison = (right.createdAt || "").localeCompare(left.createdAt || "");

    if (createdAtComparison !== 0) {
      return createdAtComparison;
    }

    return left.title.localeCompare(right.title, "hu-HU", {
      sensitivity: "base",
    });
  });
}

function createFormState(ebook?: AdminEbookListItem | null): EbookFormState {
  if (!ebook) {
    return INITIAL_FORM;
  }

  return {
    title: ebook.title,
    author: ebook.author,
    coverImageUrl: ebook.coverImageUrl,
    pdfUrl: ebook.pdfUrl,
    epubUrl: ebook.epubUrl,
    mobiUrl: ebook.mobiUrl,
    status: ebook.status,
  };
}

export function AdminEbooksList({ ebooks: initialEbooks }: { ebooks: AdminEbookListItem[] }) {
  const router = useRouter();
  const [ebooks, setEbooks] = useState(() => sortAdminEbooks(initialEbooks));
  const [editingEbookId, setEditingEbookId] = useState("");
  const [form, setForm] = useState<EbookFormState>(INITIAL_FORM);
  const [feedback, setFeedback] = useState("");
  const [modalError, setModalError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState<{ id: string; title: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [uploadingFormat, setUploadingFormat] = useState<EbookFileFormat | "">("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setEbooks(sortAdminEbooks(initialEbooks));
  }, [initialEbooks]);

  const isCreating = editingEbookId === NEW_EBOOK_ID;
  const isEditorOpen = Boolean(editingEbookId);
  const isDeleteOpen = deleteCandidate !== null;
  const isOverlayOpen = isEditorOpen || isDeleteOpen;
  const editingEbook = isCreating
    ? null
    : ebooks.find((ebook) => ebook.id === editingEbookId) ?? null;
  const isEditorBusy = isSaving || isUploadingCover || uploadingFormat.length > 0 || isPending;
  const isDeleteBusy = Boolean(pendingDeleteId) || isPending;

  useEffect(() => {
    if (!isOverlayOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (isDeleteOpen) {
        if (!pendingDeleteId) {
          setDeleteCandidate(null);
        }

        return;
      }

      if (!isEditorBusy) {
        setEditingEbookId("");
        setForm(INITIAL_FORM);
        setModalError("");
        setUploadMessage("");
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDeleteOpen, isEditorBusy, isOverlayOpen, pendingDeleteId]);

  function updateField<Key extends keyof EbookFormState>(field: Key, value: EbookFormState[Key]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetModalState(nextForm: EbookFormState = INITIAL_FORM) {
    setForm(nextForm);
    setModalError("");
    setUploadMessage("");
  }

  function openCreateModal() {
    setFeedback("");
    setDeleteCandidate(null);
    setEditingEbookId(NEW_EBOOK_ID);
    resetModalState(INITIAL_FORM);
  }

  function openEditModal(ebook: AdminEbookListItem) {
    setFeedback("");
    setDeleteCandidate(null);
    setEditingEbookId(ebook.id);
    resetModalState(createFormState(ebook));
  }

  function closeEditor() {
    if (isEditorBusy) {
      return;
    }

    setEditingEbookId("");
    resetModalState(INITIAL_FORM);
  }

  function openDeleteModal(ebook: AdminEbookListItem) {
    setFeedback("");
    setDeleteCandidate({ id: ebook.id, title: ebook.title });
  }

  function closeDeleteModal() {
    if (pendingDeleteId) {
      return;
    }

    setDeleteCandidate(null);
  }

  async function handleCoverUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setModalError("");
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
        setModalError("A borítókép optimalizálás után is túl nagy. Válassz kisebb vagy jobban tömöríthető képet.");
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
        setModalError(payload?.message ?? "A borítókép feltöltése nem sikerült.");
        return;
      }

      updateField("coverImageUrl", payload.url);
      setUploadMessage(
        optimizationMessage
          ? `${optimizationMessage} A borítókép sikeresen feltöltve.`
          : payload.message ?? "A borítókép sikeresen feltöltve.",
      );
    } catch {
      setModalError("Hálózati vagy képfeldolgozási hiba történt a borítókép feltöltése közben.");
    } finally {
      event.target.value = "";
      setIsUploadingCover(false);
    }
  }

  async function handleFileUpload(format: EbookFileFormat, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setModalError("");
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
        setModalError(payload?.message ?? "A fájl feltöltése nem sikerült.");
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
      setModalError("Hálózati hiba történt a fájl feltöltése közben.");
    } finally {
      event.target.value = "";
      setUploadingFormat("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = form.title.trim();
    const trimmedAuthor = form.author.trim();
    const trimmedCoverImageUrl = form.coverImageUrl.trim();
    const trimmedPdfUrl = form.pdfUrl.trim();
    const trimmedEpubUrl = form.epubUrl.trim();
    const trimmedMobiUrl = form.mobiUrl.trim();

    if (!trimmedTitle) {
      setModalError("Az e-könyv címe kötelező.");
      return;
    }

    if (!trimmedCoverImageUrl) {
      setModalError("Tölts fel borítóképet az e-könyvhöz.");
      return;
    }

    if (!trimmedPdfUrl && !trimmedEpubUrl && !trimmedMobiUrl) {
      setModalError("A PDF, EPUB és MOBI fájlok közül legalább egyet fel kell tölteni.");
      return;
    }

    setModalError("");
    setFeedback("");
    setIsSaving(true);

    const requestBody = {
      title: trimmedTitle,
      author: trimmedAuthor,
      coverImageUrl: trimmedCoverImageUrl,
      pdfUrl: trimmedPdfUrl,
      epubUrl: trimmedEpubUrl,
      mobiUrl: trimmedMobiUrl,
      status: form.status,
    };

    try {
      const response = await fetch(
        isCreating ? "/api/admin/ebooks" : `/api/admin/ebooks/${editingEbookId}`,
        {
          method: isCreating ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; ebook?: AdminEbookListItem }
        | null;

      if (!response.ok) {
        setModalError(
          payload?.message ??
            (isCreating ? "Az e-könyv mentése nem sikerült." : "Az e-könyv módosítása nem sikerült."),
        );
        return;
      }

      if (isCreating) {
        const createdEbook = payload?.ebook ?? {
          id: `${Date.now()}`,
          title: trimmedTitle,
          author: trimmedAuthor,
          coverImageUrl: trimmedCoverImageUrl,
          pdfUrl: trimmedPdfUrl,
          epubUrl: trimmedEpubUrl,
          mobiUrl: trimmedMobiUrl,
          status: form.status,
          createdAt: new Date().toISOString(),
        };

        setEbooks((current) => sortAdminEbooks([createdEbook, ...current]));
      } else {
        setEbooks((current) =>
          sortAdminEbooks(
            current.map((ebook) =>
              ebook.id === editingEbookId
                ? {
                    ...ebook,
                    title: trimmedTitle,
                    author: trimmedAuthor,
                    coverImageUrl: trimmedCoverImageUrl,
                    pdfUrl: trimmedPdfUrl,
                    epubUrl: trimmedEpubUrl,
                    mobiUrl: trimmedMobiUrl,
                    status: form.status,
                  }
                : ebook,
            ),
          ),
        );
      }

      setFeedback(
        payload?.message ??
          (isCreating
            ? "Az új e-könyv sikeresen létrejött."
            : "Az e-könyv adatai sikeresen frissültek."),
      );
      setEditingEbookId("");
      resetModalState(INITIAL_FORM);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setModalError(
        isCreating
          ? "Hálózati hiba történt az e-könyv mentése közben."
          : "Hálózati hiba történt az e-könyv módosítása közben.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteCandidate) {
      return;
    }

    const { id } = deleteCandidate;
    setFeedback("");
    setPendingDeleteId(id);

    try {
      const response = await fetch(`/api/admin/ebooks/${id}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setFeedback(payload?.message ?? "Az e-könyv törlése nem sikerült.");
        return;
      }

      setEbooks((current) => current.filter((ebook) => ebook.id !== id));
      setFeedback(payload?.message ?? "Az e-könyv sikeresen törölve lett.");
      setDeleteCandidate(null);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback("Hálózati hiba történt a törlés közben.");
    } finally {
      setPendingDeleteId("");
    }
  }

  return (
    <div className={styles.layout}>
      <div className="admin-card">
        <div className={styles.headerRow}>
          <div>
            <p className="eyebrow">E-könyvek</p>
            <h3>Adatbázisban tárolt e-könyvek</h3>
            <p>Ez a nézet jelenleg listázza az adatbázisban található e-könyveket.</p>
          </div>
          <button type="button" className={styles.primaryButton} onClick={openCreateModal}>
            E-könyv feltöltése
          </button>
        </div>

        {feedback ? <p className={styles.info}>{feedback}</p> : null}

        {ebooks.length === 0 ? (
          <p className={styles.empty}>Még nincs feltöltött e-könyv.</p>
        ) : (
          <div className={styles.list}>
            {ebooks.map((ebook) => {
              const isDeleting = pendingDeleteId === ebook.id;

              return (
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
                      <span>Státusz: {EBOOK_STATUS_LABELS[ebook.status]}</span>
                      {ebook.createdAt ? <span>{formatCreatedAt(ebook.createdAt)}</span> : null}
                    </div>
                    <div className={styles.fileLinks}>
                      {ebook.pdfUrl ? (
                        <a href={ebook.pdfUrl} target="_blank" rel="noreferrer" className={styles.fileLink}>
                          PDF
                        </a>
                      ) : null}
                      {ebook.epubUrl ? (
                        <a href={ebook.epubUrl} target="_blank" rel="noreferrer" className={styles.fileLink}>
                          EPUB
                        </a>
                      ) : null}
                      {ebook.mobiUrl ? (
                        <a href={ebook.mobiUrl} target="_blank" rel="noreferrer" className={styles.fileLink}>
                          MOBI
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.editButton}
                      onClick={() => openEditModal(ebook)}
                      disabled={isDeleting || isEditorOpen || isDeleteBusy}
                    >
                      Módosítás
                    </button>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => openDeleteModal(ebook)}
                      disabled={isDeleting || isEditorOpen || isDeleteBusy}
                    >
                      {isDeleting ? "Törlés..." : "Törlés"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {isEditorOpen ? (
        <div className={styles.modalBackdrop} onClick={closeEditor}>
          <div
            className={styles.modalPanel}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-ebook-editor-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className="eyebrow">{isCreating ? "Új e-könyv" : "E-könyv szerkesztése"}</p>
                <h3 id="admin-ebook-editor-title">
                  {isCreating ? "E-könyv feltöltése" : editingEbook?.title || form.title || "E-könyv szerkesztése"}
                </h3>
              </div>
              <button type="button" className={styles.secondaryButton} onClick={closeEditor} disabled={isEditorBusy}>
                Bezárás
              </button>
            </div>

            <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>Szerző</span>
                  <input
                    type="text"
                    value={form.author}
                    onChange={(event) => updateField("author", event.target.value)}
                    className={styles.input}
                    disabled={isEditorBusy}
                  />
                </label>

                <label className={styles.field}>
                  <span>Cím</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    className={styles.input}
                    disabled={isEditorBusy}
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span>Státusz</span>
                  <select
                    value={form.status}
                    onChange={(event) => updateField("status", event.target.value as EbookStatus)}
                    className={styles.input}
                    disabled={isEditorBusy}
                  >
                    {EBOOK_STATUS_VALUES.map((status) => (
                      <option key={status} value={status}>
                        {EBOOK_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>

                <div className={`${styles.field} ${styles.fieldWide}`}>
                  <span>Borítókép feltöltése</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                    onChange={(event) => {
                      void handleCoverUpload(event);
                    }}
                    className={`${styles.input} ${styles.fileInput}`}
                    disabled={isEditorBusy}
                  />
                  <span className={styles.hint}>
                    A JPEG, PNG és WEBP képeket feltöltés előtt automatikusan optimalizáljuk. A végleges fájl legfeljebb 5 MB lehet.
                  </span>
                  <span className={styles.hint}>
                    A PDF, EPUB és MOBI fájlok közül legalább egy feltöltése kötelező.
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
                    disabled={isEditorBusy}
                  />
                  <span className={styles.fileStatus}>{form.pdfUrl ? "PDF feltöltve" : "Még nincs PDF fájl"}</span>
                  {form.pdfUrl ? (
                    <a href={form.pdfUrl} target="_blank" rel="noreferrer" className={styles.fileLink}>
                      PDF megnyitása
                    </a>
                  ) : null}
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
                    disabled={isEditorBusy}
                  />
                  <span className={styles.fileStatus}>{form.epubUrl ? "EPUB feltöltve" : "Még nincs EPUB fájl"}</span>
                  {form.epubUrl ? (
                    <a href={form.epubUrl} target="_blank" rel="noreferrer" className={styles.fileLink}>
                      EPUB megnyitása
                    </a>
                  ) : null}
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
                    disabled={isEditorBusy}
                  />
                  <span className={styles.fileStatus}>{form.mobiUrl ? "MOBI feltöltve" : "Még nincs MOBI fájl"}</span>
                  {form.mobiUrl ? (
                    <a href={form.mobiUrl} target="_blank" rel="noreferrer" className={styles.fileLink}>
                      MOBI megnyitása
                    </a>
                  ) : null}
                </label>
              </div>

              {uploadingFormat ? (
                <p className={styles.info}>{`${uploadingFormat.toUpperCase()} fájl feltöltése folyamatban...`}</p>
              ) : null}
              {isUploadingCover ? <p className={styles.info}>A borítókép feltöltése folyamatban...</p> : null}
              {uploadMessage ? <p className={styles.info}>{uploadMessage}</p> : null}
              {modalError ? <p className={styles.error}>{modalError}</p> : null}

              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryButton} onClick={closeEditor} disabled={isEditorBusy}>
                  Mégse
                </button>
                <button type="submit" className={styles.primaryButton} disabled={isEditorBusy}>
                  {isSaving
                    ? isCreating
                      ? "Létrehozás folyamatban..."
                      : "Mentés folyamatban..."
                    : isCreating
                      ? "E-könyv létrehozása"
                      : "Mentés"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isDeleteOpen && deleteCandidate ? (
        <div className={styles.modalBackdrop} onClick={closeDeleteModal}>
          <div
            className={`${styles.modalPanel} ${styles.confirmPanel}`}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-ebook-delete-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className="eyebrow">E-könyv törlése</p>
                <h3 id="admin-ebook-delete-title">Biztosan törlöd ezt az e-könyvet?</h3>
              </div>
              <button type="button" className={styles.secondaryButton} onClick={closeDeleteModal} disabled={Boolean(pendingDeleteId)}>
                Bezárás
              </button>
            </div>

            <p className={styles.confirmText}>
              A következő e-könyv végleg törlődni fog a listából: <strong>{deleteCandidate.title}</strong>
            </p>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={closeDeleteModal} disabled={Boolean(pendingDeleteId)}>
                Mégse
              </button>
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => {
                  void handleDelete();
                }}
                disabled={Boolean(pendingDeleteId)}
              >
                {pendingDeleteId ? "Törlés folyamatban..." : "E-könyv törlése"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}



