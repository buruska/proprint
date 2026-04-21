"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
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

function extractImageTags(value: string) {
  const matches: Array<{
    markup: string;
    src: string;
    start: number;
    end: number;
  }> = [];
  const imagePattern = /<img\b[^>]*src=(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))[^>]*>/gi;

  let match = imagePattern.exec(value);

  while (match) {
    const src = match[1] ?? match[2] ?? match[3] ?? "";

    if (src.trim()) {
      matches.push({
        markup: match[0],
        src: src.trim(),
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    match = imagePattern.exec(value);
  }

  return matches;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/\n/g, " ").trim();
}

function plainTextToEditorHtml(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

function createEditorImageChip(src: string, index: number) {
  return `<span class="${styles.imageChip}" contenteditable="false" data-service-image="true" data-image-src="${escapeAttribute(src)}">Kép ${index}</span>`;
}

function convertStoredHtmlToEditorHtml(value: string) {
  if (!value.trim()) {
    return "<p></p>";
  }

  const baseMarkup = /<\s*[a-z!/]/i.test(value) ? value : plainTextToEditorHtml(value);
  let imageIndex = 0;

  const editorMarkup = baseMarkup.replace(/<img\b[^>]*src=(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))[^>]*>/gi, (_match, quotedSrc, singleQuotedSrc, bareSrc) => {
    const src = String(quotedSrc ?? singleQuotedSrc ?? bareSrc ?? "").trim();

    if (!src) {
      return "";
    }

    imageIndex += 1;
    return createEditorImageChip(src, imageIndex);
  });

  return editorMarkup || "<p></p>";
}

function convertEditorHtmlToStoredHtml(value: string) {
  return value.replace(/<span\b[^>]*data-service-image="true"[^>]*>[\s\S]*?<\/span>/gi, (match) => {
    const srcMatch = match.match(/data-image-src="([^"]+)"/i);
    const imageSrc = srcMatch?.[1]?.trim();

    if (!imageSrc) {
      return "";
    }

    return `<img src="${escapeAttribute(imageSrc)}" alt="" />`;
  });
}

export function AdminServicesManager({ initialContent }: { initialContent: ServicesPageContent }) {
  const [cards, setCards] = useState<ServiceCard[]>(initialContent.cards);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialContent.updatedAt);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [uploadingCardId, setUploadingCardId] = useState<string | null>(null);
  const [uploadMessageById, setUploadMessageById] = useState<Record<string, string>>({});
  const [isSaving, startSavingTransition] = useTransition();
  const editorRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const selectionRangesRef = useRef<Record<string, Range | null>>({});

  useEffect(() => {
    cards.forEach((card) => {
      const editor = editorRefs.current[card.id];

      if (!editor) {
        return;
      }

      const nextHtml = convertStoredHtmlToEditorHtml(card.pricingText);

      if (editor.innerHTML !== nextHtml) {
        editor.innerHTML = nextHtml;
      }
    });
  }, [cards]);

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

  function updateCardText(cardId: string, nextValue: string) {
    updateCard(cardId, "pricingText", nextValue);
  }

  function syncCardTextFromEditor(cardId: string) {
    const editor = editorRefs.current[cardId];

    if (!editor) {
      return;
    }

    const nextValue = convertEditorHtmlToStoredHtml(editor.innerHTML);
    updateCardText(cardId, nextValue);
  }

  function ensureEditorHasContent(cardId: string) {
    const editor = editorRefs.current[cardId];

    if (!editor) {
      return;
    }

    if (!editor.innerHTML.trim()) {
      editor.innerHTML = "<p></p>";
    }
  }

  function rememberSelection(cardId: string) {
    const editor = editorRefs.current[cardId];
    const selection = window.getSelection();

    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (!editor.contains(range.commonAncestorContainer)) {
      return;
    }

    selectionRangesRef.current[cardId] = range.cloneRange();
  }

  function focusEditor(cardId: string) {
    const editor = editorRefs.current[cardId];
    const selection = window.getSelection();

    if (!editor || !selection) {
      return false;
    }

    editor.focus();

    const savedRange = selectionRangesRef.current[cardId];

    if (savedRange) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
      return true;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    selectionRangesRef.current[cardId] = range.cloneRange();

    return true;
  }

  function insertHtmlAtCursor(cardId: string, html: string) {
    if (!focusEditor(cardId)) {
      return;
    }

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const template = document.createElement("template");
    template.innerHTML = html.trim();
    const fragment = template.content;
    const lastNode = fragment.lastChild;

    range.insertNode(fragment);

    if (!lastNode) {
      return;
    }

    range.setStartAfter(lastNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    selectionRangesRef.current[cardId] = range.cloneRange();
  }

  function renumberEditorImageChips(cardId: string) {
    const editor = editorRefs.current[cardId];

    if (!editor) {
      return;
    }

    editor
      .querySelectorAll<HTMLElement>("[data-service-image='true']")
      .forEach((chip, index) => {
        chip.textContent = `Kép ${index + 1}`;
      });
  }

  function runEditorMutation(cardId: string, mutate: () => void) {
    if (!focusEditor(cardId)) {
      return;
    }

    mutate();
    ensureEditorHasContent(cardId);
    renumberEditorImageChips(cardId);
    syncCardTextFromEditor(cardId);
    rememberSelection(cardId);
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

  async function handleInlineImageInsert(cardId: string, event: ChangeEvent<HTMLInputElement>) {
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
        setError("A beszúrt kép legfeljebb 5 MB méretű lehet.");
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
        setError(payload?.message ?? "A kép feltöltése nem sikerült.");
        return;
      }

      const uploadedImageUrl = payload.url;

      runEditorMutation(cardId, () => {
        const currentIndex = extractImageTags(cards.find((item) => item.id === cardId)?.pricingText ?? "").length + 1;
        insertHtmlAtCursor(cardId, createEditorImageChip(uploadedImageUrl, currentIndex));
      });
      setUploadMessageById((current) => ({
        ...current,
        [cardId]: optimizationMessage || payload.message || "A kép sikeresen beszúrva.",
      }));
    } catch {
      setError("A kép feltöltése közben hiba történt. Próbáld meg újra.");
    } finally {
      setUploadingCardId(null);
    }
  }

  async function handleInlineImageReplace(
    cardId: string,
    imageIndex: number,
    event: ChangeEvent<HTMLInputElement>,
  ) {
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
        setError("A beszúrt kép legfeljebb 5 MB méretű lehet.");
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
        setError(payload?.message ?? "A kép cseréje nem sikerült.");
        return;
      }

      const card = cards.find((item) => item.id === cardId);

      if (!card) {
        return;
      }

      const imageTags = extractImageTags(card.pricingText);
      const targetImage = imageTags[imageIndex];

      if (!targetImage) {
        return;
      }

      const replacementMarkup = `<img src="${payload.url}" alt="" />`;
      const nextValue = `${card.pricingText.slice(0, targetImage.start)}${replacementMarkup}${card.pricingText.slice(targetImage.end)}`;

      updateCardText(cardId, nextValue);
      setUploadMessageById((current) => ({
        ...current,
        [cardId]: optimizationMessage || payload.message || "A beszúrt kép sikeresen cserélve.",
      }));
    } catch {
      setError("A kép cseréje közben hiba történt. Próbáld meg újra.");
    } finally {
      setUploadingCardId(null);
    }
  }

  function handleInlineImageDelete(cardId: string, imageIndex: number) {
    const card = cards.find((item) => item.id === cardId);

    if (!card) {
      return;
    }

    const imageTags = extractImageTags(card.pricingText);
    const targetImage = imageTags[imageIndex];

    if (!targetImage) {
      return;
    }

    const nextValue = `${card.pricingText.slice(0, targetImage.start)}${card.pricingText.slice(targetImage.end)}`
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    updateCardText(cardId, nextValue);
    setUploadMessageById((current) => ({
      ...current,
      [cardId]: "A beszúrt kép törölve lett a szövegből.",
    }));
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
          const inlineImages = extractImageTags(card.pricingText);

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
                  <div
                    ref={(node) => {
                      editorRefs.current[card.id] = node;
                    }}
                    className={`${styles.editorSurface} rich-content`}
                    contentEditable={!isBusy}
                    suppressContentEditableWarning
                    data-placeholder="Ide kerül majd a szolgáltatás szövege. A kurzor helyére képet is beszúrhatsz."
                    data-empty={card.pricingText.trim() ? "false" : "true"}
                    onInput={() => {
                      renumberEditorImageChips(card.id);
                      syncCardTextFromEditor(card.id);
                    }}
                    onBlur={() => {
                      ensureEditorHasContent(card.id);
                      renumberEditorImageChips(card.id);
                      syncCardTextFromEditor(card.id);
                      rememberSelection(card.id);
                    }}
                    onKeyUp={() => rememberSelection(card.id)}
                    onMouseUp={() => rememberSelection(card.id)}
                    onClick={() => rememberSelection(card.id)}
                    onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => {
                      if (event.target instanceof HTMLElement && event.target.dataset.serviceImage === "true") {
                        event.preventDefault();
                        rememberSelection(card.id);
                      }
                    }}
                    onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        rememberSelection(card.id);
                      }
                    }}
                  />
                </label>

                <div className={styles.gallerySection}>
                  <p className={styles.sectionLabel}>Képek beszúrása a szövegbe</p>
                  <label className={styles.uploadLabel}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      className={styles.fileInput}
                      onClick={() => rememberSelection(card.id)}
                      onChange={(event) => void handleInlineImageInsert(card.id, event)}
                      disabled={isBusy}
                    />
                    Kép beszúrása a kurzorhoz
                  </label>

                  {inlineImages.length === 0 ? (
                    <div className={styles.galleryEmpty}>Ehhez a szolgáltatáshoz még nincs beszúrt kép a szövegben.</div>
                  ) : (
                    <div className={styles.galleryGrid}>
                      {inlineImages.map((image, imageIndex) => (
                        <article key={`${image.src}-${imageIndex}`} className={styles.galleryCard}>
                          <div className={styles.galleryPreview}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={image.src}
                              alt={`${card.title} kép ${imageIndex + 1}.`}
                              className={styles.galleryImage}
                            />
                          </div>

                          <div className={styles.galleryActions}>
                            <span className={styles.galleryBadge}>{imageIndex + 1}.</span>
                            <label className={styles.uploadLabel}>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                                className={styles.fileInput}
                                onChange={(event) => void handleInlineImageReplace(card.id, imageIndex, event)}
                                disabled={isBusy}
                              />
                              Módosítás
                            </label>
                            <button
                              type="button"
                              className={styles.removeButton}
                              onClick={() => handleInlineImageDelete(card.id, imageIndex)}
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
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

