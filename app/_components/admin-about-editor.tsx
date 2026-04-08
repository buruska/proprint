"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import imageCompression from "browser-image-compression";

import {
  type AboutPageContent,
  type EditablePageContent,
} from "@/lib/rich-page-content";

const COMPRESSIBLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_UPLOAD_SIZE = 8 * 1024 * 1024;
const DEFAULT_EDITOR_HTML = "<p>Új bekezdés</p>";

type ToolbarIconButtonProps = {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
};

function formatUploadFileSize(sizeInBytes: number) {
  const sizeInMegabytes = sizeInBytes / (1024 * 1024);

  if (sizeInMegabytes >= 1) {
    return `${sizeInMegabytes.toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
}

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

async function optimizeContentImageUpload(file: File) {
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

function ToolbarIconButton({ label, disabled, onClick, children }: ToolbarIconButtonProps) {
  return (
    <button
      type="button"
      className="button-ghost about-editor-toolbar__button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function ToolbarIcon({ children }: { children: ReactNode }) {
  return <span className="about-editor-toolbar__icon">{children}</span>;
}

function ParagraphIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 6.5h14M5 10.5h14M5 14.5h9M5 18.5h9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function BoldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8 5.5h5.5a3.5 3.5 0 0 1 0 7H8zm0 7h6.5a3.5 3.5 0 0 1 0 7H8z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14 5.5h5M5 18.5h5M14 5.5l-4 13"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function HeadingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5.5 6v12M12.5 6v12M5.5 12h7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M16 8.2c.7-.6 1.5-.9 2.4-.9 1.3 0 2.2.6 2.2 1.7 0 .8-.4 1.2-1.2 1.8l-1 .7c-.8.5-1.1.9-1.1 1.8V14h3.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="7" r="1.3" fill="currentColor" />
      <circle cx="6" cy="12" r="1.3" fill="currentColor" />
      <circle cx="6" cy="17" r="1.3" fill="currentColor" />
      <path
        d="M10 7h8M10 12h8M10 17h8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8.8 8.2c-1.7 1-2.8 2.6-2.8 4.7 0 1.8 1 3.1 2.5 3.1 1.4 0 2.4-1.1 2.4-2.5 0-1.5-1.1-2.4-2.6-2.4-.2 0-.5 0-.7.1.4-1.1 1.3-2 2.6-2.8zm8 0c-1.7 1-2.8 2.6-2.8 4.7 0 1.8 1 3.1 2.5 3.1 1.4 0 2.4-1.1 2.4-2.5 0-1.5-1.1-2.4-2.6-2.4-.2 0-.5 0-.7.1.4-1.1 1.3-2 2.6-2.8z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 13.8 8 15.8a3 3 0 1 1-4.2-4.2l3-3a3 3 0 0 1 4.2 0M14 10.2l2-2a3 3 0 1 1 4.2 4.2l-3 3a3 3 0 0 1-4.2 0M9 15l6-6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function AdminAboutEditor({ initialContent }: { initialContent: AboutPageContent }) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [form, setForm] = useState<EditablePageContent>({
    eyebrow: initialContent.eyebrow,
    title: initialContent.title,
    description: initialContent.description,
    bodyHtml: initialContent.bodyHtml,
  });
  const [savedAt, setSavedAt] = useState<string | null>(initialContent.updatedAt);
  const [feedback, setFeedback] = useState("");
  const [imageFeedback, setImageFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const isBusy = isSaving || isUploadingImage;

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const nextHtml = form.bodyHtml || DEFAULT_EDITOR_HTML;

    if (editor.innerHTML !== nextHtml) {
      editor.innerHTML = nextHtml;
    }
  }, [form.bodyHtml]);

  function updateField<Key extends keyof EditablePageContent>(
    field: Key,
    value: EditablePageContent[Key],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function syncBodyHtmlFromEditor() {
    const nextHtml = editorRef.current?.innerHTML ?? "";

    setForm((current) => {
      if (current.bodyHtml === nextHtml) {
        return current;
      }

      return {
        ...current,
        bodyHtml: nextHtml,
      };
    });
  }

  function ensureEditorHasContent() {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    if (!editor.innerHTML.trim()) {
      editor.innerHTML = DEFAULT_EDITOR_HTML;
    }
  }

  function rememberSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (!editor.contains(range.commonAncestorContainer)) {
      return;
    }

    savedSelectionRef.current = range.cloneRange();
  }

  function focusEditor() {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection) {
      return false;
    }

    editor.focus();

    if (savedSelectionRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedSelectionRef.current);
      return true;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    savedSelectionRef.current = range.cloneRange();

    return true;
  }

  function insertHtmlAtCursor(html: string) {
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
    savedSelectionRef.current = range.cloneRange();
  }

  function runEditorMutation(mutate: () => void) {
    if (!focusEditor()) {
      return;
    }

    mutate();
    ensureEditorHasContent();
    syncBodyHtmlFromEditor();
    rememberSelection();
  }

  function insertParagraph() {
    runEditorMutation(() => {
      insertHtmlAtCursor("<p>Új bekezdés</p>");
    });
  }

  function toggleBold() {
    runEditorMutation(() => {
      document.execCommand("bold");
    });
  }

  function toggleItalic() {
    runEditorMutation(() => {
      document.execCommand("italic");
    });
  }

  function insertHeading() {
    runEditorMutation(() => {
      insertHtmlAtCursor("<h3>Új alcím</h3>");
    });
  }

  function insertList() {
    runEditorMutation(() => {
      const selectionText = window.getSelection()?.toString().trim() ?? "";

      if (selectionText) {
        document.execCommand("insertUnorderedList");
        return;
      }

      insertHtmlAtCursor("<ul><li>Első pont</li><li>Második pont</li></ul>");
    });
  }

  function insertQuote() {
    runEditorMutation(() => {
      const selectionText = window.getSelection()?.toString().trim() ?? "";

      if (selectionText) {
        document.execCommand("formatBlock", false, "blockquote");
        return;
      }

      insertHtmlAtCursor("<blockquote>Idézet helye</blockquote>");
    });
  }

  function insertLink() {
    runEditorMutation(() => {
      const selectionText = window.getSelection()?.toString().trim() ?? "";

      if (selectionText) {
        document.execCommand("createLink", false, "https://");
        return;
      }

      insertHtmlAtCursor('<a href="https://">Link szövege</a>');
    });
  }

  function insertUploadedImage(url: string) {
    runEditorMutation(() => {
      insertHtmlAtCursor(`<img src="${url}" alt="" />`);
    });
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setFeedback("");
    setImageFeedback("");
    setIsUploadingImage(true);

    try {
      let uploadFile = file;
      let optimizationMessage = "";

      try {
        const optimizedUpload = await optimizeContentImageUpload(file);
        uploadFile = optimizedUpload.file;
        optimizationMessage = optimizedUpload.sizeMessage;
      } catch {
        uploadFile = file;
      }

      if (uploadFile.size > MAX_IMAGE_UPLOAD_SIZE) {
        setFeedback("A kiválasztott kép optimalizálás után is túl nagy. Válassz kisebb vagy jobban tömöríthető képet.");
        return;
      }

      const formData = new FormData();
      formData.append("file", uploadFile);

      const response = await fetch("/api/admin/uploads/content-image", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; url?: string }
        | null;

      if (!response.ok || !payload?.url) {
        setFeedback(payload?.message ?? "A kép feltöltése nem sikerült.");
        return;
      }

      insertUploadedImage(payload.url);
      setImageFeedback(
        optimizationMessage
          ? `${optimizationMessage} ${payload.message ?? "A kép sikeresen beszúrva."}`
          : payload.message ?? "A kép sikeresen beszúrva.",
      );
    } catch {
      setFeedback("Hálózati vagy képfeldolgozási hiba történt a kép feltöltése közben.");
    } finally {
      event.target.value = "";
      setIsUploadingImage(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setImageFeedback("");
    syncBodyHtmlFromEditor();
    setIsSaving(true);

    try {
      const currentBodyHtml = editorRef.current?.innerHTML ?? form.bodyHtml;
      const payloadToSave = {
        ...form,
        bodyHtml: currentBodyHtml,
      };
      const response = await fetch("/api/admin/about", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payloadToSave),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; content?: AboutPageContent }
        | null;

      if (!response.ok || !payload?.content) {
        setFeedback(payload?.message ?? "A Kiadóról oldal mentése nem sikerült.");
        return;
      }

      setForm({
        eyebrow: payload.content.eyebrow,
        title: payload.content.title,
        description: payload.content.description,
        bodyHtml: payload.content.bodyHtml,
      });
      setSavedAt(payload.content.updatedAt);
      setFeedback(payload.message ?? "A Kiadóról oldal tartalma elmentve.");
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
          <p className="eyebrow">Kiadóról szerkesztő</p>
          <h3>A publikus `/about` oldal tartalma</h3>
        </div>
        <p className="admin-meta-note">Utolsó mentés: {formatSavedAt(savedAt)}</p>
      </div>

      <form className="admin-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Aloldal címe
          <input
            type="text"
            value={form.eyebrow}
            onChange={(event) => updateField("eyebrow", event.target.value)}
            disabled={isBusy}
            maxLength={80}
          />
        </label>


        <div className="about-editor-field">
          <div className="about-editor-field__header">
            <label htmlFor="about-body-editor">Törzstartalom</label>
            <span className="admin-meta-note">
              A szerkesztőben már a végleges megjelenéshez közeli formázást látod.
            </span>
          </div>

          <div className="about-editor-canvas editorial-panel editorial-panel--single">
            <div className="about-editor-toolbar">
              <ToolbarIconButton label="Bekezdés" onClick={insertParagraph} disabled={isBusy}>
                <ToolbarIcon>
                  <ParagraphIcon />
                </ToolbarIcon>
              </ToolbarIconButton>
              <ToolbarIconButton label="Félkövér" onClick={toggleBold} disabled={isBusy}>
                <ToolbarIcon>
                  <BoldIcon />
                </ToolbarIcon>
              </ToolbarIconButton>
              <ToolbarIconButton label="Dőlt" onClick={toggleItalic} disabled={isBusy}>
                <ToolbarIcon>
                  <ItalicIcon />
                </ToolbarIcon>
              </ToolbarIconButton>
              <ToolbarIconButton label="Alcím" onClick={insertHeading} disabled={isBusy}>
                <ToolbarIcon>
                  <HeadingIcon />
                </ToolbarIcon>
              </ToolbarIconButton>
              <ToolbarIconButton label="Lista" onClick={insertList} disabled={isBusy}>
                <ToolbarIcon>
                  <ListIcon />
                </ToolbarIcon>
              </ToolbarIconButton>
              <ToolbarIconButton label="Idézet" onClick={insertQuote} disabled={isBusy}>
                <ToolbarIcon>
                  <QuoteIcon />
                </ToolbarIcon>
              </ToolbarIconButton>
              <ToolbarIconButton label="Link" onClick={insertLink} disabled={isBusy}>
                <ToolbarIcon>
                  <LinkIcon />
                </ToolbarIcon>
              </ToolbarIconButton>
            </div>

            <div
              id="about-body-editor"
              ref={editorRef}
              className="rich-content about-editor-surface"
              contentEditable={!isBusy}
              suppressContentEditableWarning
              onInput={syncBodyHtmlFromEditor}
              onBlur={() => {
                ensureEditorHasContent();
                syncBodyHtmlFromEditor();
                rememberSelection();
              }}
              onKeyUp={rememberSelection}
              onMouseUp={rememberSelection}
            />
          </div>
        </div>

        <label>
          Kép beszúrása
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            onClick={rememberSelection}
            onChange={(event) => {
              void handleImageUpload(event);
            }}
            disabled={isBusy}
          />
        </label>

        <p className="admin-meta-note">
          A feltöltött kép a kurzor aktuális helyére kerül közvetlenül a szerkesztett tartalomba.
        </p>

        {imageFeedback ? <p className="admin-success-note">{imageFeedback}</p> : null}
        {feedback ? <p className="admin-success-note">{feedback}</p> : null}

        <div className="admin-form__actions">
          <button type="submit" disabled={isBusy}>
            {isSaving ? "Mentés folyamatban..." : isUploadingImage ? "Képfeltöltés folyamatban..." : "Mentés"}
          </button>
        </div>
      </form>
    </div>
  );
}



