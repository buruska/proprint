"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";

import type { BookStatus } from "@/lib/book-status";
import { BOOK_STATUS_LABELS, BOOK_STATUS_VALUES } from "@/lib/book-status";
import {
  BOOK_LANGUAGE_LABELS,
  BOOK_LANGUAGE_VALUES,
  normalizeBookLanguage,
} from "@/lib/book-language";
import { formatBookIsbn, sanitizeBookIsbnInput } from "@/lib/book-isbn";
import {
  BOOK_SIZE_PRESET_LABELS,
  BOOK_SIZE_PRESET_VALUES,
  formatCustomBookSize,
  getBookSizePresetDimensions,
  sanitizeBookSizeDimensionInput,
  parseBookSize,
  type BookSizePreset,
} from "@/lib/book-size";
import { formatCurrency, normalizeRichTextToPlainText, normalizeSearchValue } from "@/lib/utils";
import { MANAGED_BOOK_COVER_URL_PREFIX } from "@/lib/upload-url";

import styles from "./admin-books-list.module.css";

type AdminBookListItem = {
  id: string;
  title: string;
  author: string;
  language: string;
  description: string;
  publicationYear: number | null;
  publicationDate: string;
  isbn: string;
  pageCount: number | null;
  keywords: string[];
  size: string;
  price: number | null;
  coverImageUrl: string;
  status: BookStatus;
};

type BookStatusFilter = "all" | BookStatus;

type EditFormState = {
  title: string;
  author: string;
  language: string;
  description: string;
  publicationYearInput: string;
  publicationMonth: string;
  publicationDay: string;
  isbn: string;
  pageCount: string;
  keywords: string;
  sizePreset: BookSizePreset | "";
  customWidth: string;
  customHeight: string;
  price: string;
  coverImageUrl: string;
  status: BookStatus;
};

const BOOK_MONTH_OPTIONS = [
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

const COMPRESSIBLE_COVER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_COVER_UPLOAD_SIZE = 5 * 1024 * 1024;
const NEW_BOOK_ID = "__new__";

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

function createEditForm(book: AdminBookListItem): EditFormState {
  const publicationDateParts = getPublicationDateParts(book.publicationDate);
  const fallbackDateParts = getTodayPublicationDateParts();
  const resolvedPublicationDateParts = publicationDateParts.year
    ? publicationDateParts
    : fallbackDateParts;
  const parsedSize = parseBookSize(book.size);

  return {
    title: book.title,
    author: book.author,
    language: normalizeBookLanguage(book.language) || "magyar",
    description: normalizeRichTextToPlainText(book.description),
    publicationYearInput: resolvedPublicationDateParts.year,
    publicationMonth: resolvedPublicationDateParts.month,
    publicationDay: resolvedPublicationDateParts.day,
    isbn: formatBookIsbn(book.isbn),
    pageCount: typeof book.pageCount === "number" ? `${book.pageCount}` : "",
    keywords: book.keywords.join(", "),
    sizePreset: parsedSize.preset,
    customWidth: parsedSize.customWidth,
    customHeight: parsedSize.customHeight,
    price: typeof book.price === "number" ? `${book.price}` : "",
    coverImageUrl: book.coverImageUrl,
    status: book.status,
  };
}

function createEmptyEditForm(): EditFormState {
  const today = getTodayPublicationDateParts();

  return {
    title: "",
    author: "",
    language: "magyar",
    description: "",
    publicationYearInput: today.year,
    publicationMonth: today.month,
    publicationDay: today.day,
    isbn: "978-606-556-",
    pageCount: "",
    keywords: "",
    sizePreset: "",
    customWidth: "",
    customHeight: "",
    price: "",
    coverImageUrl: "",
    status: "draft",
  };
}

function sortAdminBooks(items: AdminBookListItem[]) {
  return [...items].sort((left, right) => {
    const dateComparison = (right.publicationDate || "").localeCompare(left.publicationDate || "");

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return left.title.localeCompare(right.title, "hu-HU", {
      sensitivity: "base",
    });
  });
}

function formatPrice(price: number | null) {
  if (price === null) {
    return "Nincs ár megadva";
  }

  return formatCurrency(price);
}

function formatPublicationYear(publicationYear: number | null) {
  if (publicationYear === null) {
    return "Nincs évszám megadva";
  }

  return `${publicationYear}`;
}

function getPublicationYearFromDate(publicationDate: string) {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(publicationDate.trim());

  if (!match) {
    return null;
  }

  return Number(match[1]);
}

function getPublicationDateParts(publicationDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(publicationDate.trim());

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

function getTodayPublicationDateParts() {
  const today = new Date();

  return {
    year: `${today.getFullYear()}`,
    month: `${today.getMonth() + 1}`.padStart(2, "0"),
    day: `${today.getDate()}`.padStart(2, "0"),
  };
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

function buildPublicationDate(year: string, month: string, day: string) {
  const normalizedYear = year.trim();
  const hasAnyValue = normalizedYear.length > 0 || month.length > 0 || day.length > 0;

  if (!hasAnyValue) {
    return {
      ok: true as const,
      value: "",
    };
  }

  if (!/^\d{4}$/.test(normalizedYear)) {
    return {
      ok: false as const,
      message: "A kiadási év négy számjegyből álljon.",
    };
  }

  if (!month || !day) {
    return {
      ok: false as const,
      message: "A kiadási dátumhoz válassz évet, hónapot és napot is.",
    };
  }

  const maxDay = getDaysInMonth(normalizedYear, month);
  const numericDay = Number(day);

  if (!Number.isInteger(numericDay) || numericDay < 1 || numericDay > maxDay) {
    return {
      ok: false as const,
      message: "A kiválasztott nap nem érvényes ebben a hónapban.",
    };
  }

  return {
    ok: true as const,
    value: `${normalizedYear}-${month}-${day}`,
  };
}

function parseOptionalInteger(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      ok: true as const,
      value: null,
    };
  }

  const parsed = Number(trimmed);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return {
      ok: false as const,
    };
  }

  return {
    ok: true as const,
    value: parsed,
  };
}

function parseOptionalDecimal(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      ok: true as const,
      value: null,
    };
  }

  const parsed = Number(trimmed.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed < 0) {
    return {
      ok: false as const,
    };
  }

  return {
    ok: true as const,
    value: parsed,
  };
}

function normalizeKeywords(value: string) {
  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}


export function AdminBooksList({ books }: { books: AdminBookListItem[] }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [editFeedback, setEditFeedback] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState<{ id: string; title: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<BookStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingBookId, setEditingBookId] = useState("");
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isDeletingCover, setIsDeletingCover] = useState(false);
  const [coverUploadMessage, setCoverUploadMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [localBooks, setLocalBooks] = useState(() => sortAdminBooks(books));
  const [statusById, setStatusById] = useState<Record<string, BookStatus>>(
    Object.fromEntries(books.map((book) => [book.id, book.status])),
  );

  useEffect(() => {
    setLocalBooks(sortAdminBooks(books));
    setStatusById(Object.fromEntries(books.map((book) => [book.id, book.status])));
  }, [books]);

  const isCreatingBook = editingBookId === NEW_BOOK_ID;
  const isEditOpen = editForm !== null;
  const isDeleteModalOpen = deleteCandidate !== null;
  const isOverlayOpen = isEditOpen || isDeleteModalOpen;
  const editingBook = isCreatingBook
    ? null
    : localBooks.find((book) => book.id === editingBookId) ?? null;
  const isEditBusy = isSavingEdit || isPending || isUploadingCover || isDeletingCover;

  useEffect(() => {
    if (!isOverlayOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (isDeleteModalOpen) {
        if (!pendingDeleteId) {
          setDeleteCandidate(null);
        }

        return;
      }

      if (!isEditBusy) {
        setEditingBookId("");
        setEditForm(null);
        setEditFeedback("");
        setCoverUploadMessage("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDeleteModalOpen, isEditBusy, isOverlayOpen, pendingDeleteId]);

  useEffect(() => {
    if (!isOverlayOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOverlayOpen]);

  function closeEditModal() {
    if (isSavingEdit || isUploadingCover || isDeletingCover) {
      return;
    }

    setEditingBookId("");
    setEditForm(null);
    setEditFeedback("");
    setCoverUploadMessage("");
  }

  function closeDeleteModal() {
    if (pendingDeleteId) {
      return;
    }

    setDeleteCandidate(null);
  }

  function openEditModal(book: AdminBookListItem) {
    const currentStatus = statusById[book.id] ?? book.status;

    setFeedback("");
    setEditFeedback("");
    setCoverUploadMessage("");
    setDeleteCandidate(null);
    setEditingBookId(book.id);
    setEditForm(
      createEditForm({
        ...book,
        status: currentStatus,
      }),
    );
  }

  function openCreateModal() {
    setFeedback("");
    setEditFeedback("");
    setCoverUploadMessage("");
    setDeleteCandidate(null);
    setEditingBookId(NEW_BOOK_ID);
    setEditForm(createEmptyEditForm());
  }

  function openPriceManagementPage() {
    router.push("/admin/books/prices");
  }

  function updateEditField<Key extends keyof EditFormState>(
    field: Key,
    value: EditFormState[Key],
  ) {
    setEditForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  function updateSizePreset(value: EditFormState["sizePreset"]) {
    setEditForm((current) => {
      if (!current) {
        return current;
      }

      if (!value) {
        return {
          ...current,
          sizePreset: value,
          customWidth: "",
          customHeight: "",
        };
      }

      if (value === "egyedi") {
        return {
          ...current,
          sizePreset: value,
        };
      }

      const dimensions = getBookSizePresetDimensions(value);

      return {
        ...current,
        sizePreset: value,
        customWidth: dimensions.width,
        customHeight: dimensions.height,
      };
    });
  }

  async function handleCoverUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setEditFeedback("");
    setCoverUploadMessage("");
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
        setEditFeedback("A borítókép optimalizálás után is túl nagy. Válassz kisebb vagy jobban tömöríthető képet.");
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
        setEditFeedback(payload?.message ?? "A borítókép feltöltése nem sikerült.");
        return;
      }

      updateEditField("coverImageUrl", payload.url);
      setCoverUploadMessage(
        optimizationMessage
          ? `${optimizationMessage} A borítókép sikeresen feltöltve.`
          : payload.message ?? "A borítókép sikeresen feltöltve.",
      );
    } catch {
      setEditFeedback("Hálózati vagy képfeldolgozási hiba történt a borítókép feltöltése közben.");
    } finally {
      event.target.value = "";
      setIsUploadingCover(false);
    }
  }

  async function handleCoverDelete() {
    if (!editForm?.coverImageUrl) {
      return;
    }

    setEditFeedback("");
    setCoverUploadMessage("");

    if (!editForm.coverImageUrl.startsWith(MANAGED_BOOK_COVER_URL_PREFIX)) {
      updateEditField("coverImageUrl", "");
      setCoverUploadMessage("A borítókép URL törölve lett.");
      return;
    }

    setIsDeletingCover(true);

    try {
      const response = await fetch("/api/admin/uploads/book-cover", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: editForm.coverImageUrl }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setEditFeedback(payload?.message ?? "A borítókép törlése nem sikerült.");
        return;
      }

      updateEditField("coverImageUrl", "");
      setCoverUploadMessage(payload?.message ?? "A borítókép sikeresen törölve lett.");
    } catch {
      setEditFeedback("Hálózati hiba történt a borítókép törlése közben.");
    } finally {
      setIsDeletingCover(false);
    }
  }

  function updatePublicationYearInput(value: string) {
    const normalizedValue = value.replace(/\D/g, "").slice(0, 4);

    setEditForm((current) => {
      if (!current) {
        return current;
      }

      const maxDay = getDaysInMonth(normalizedValue, current.publicationMonth);
      const nextPublicationDay =
        current.publicationDay && Number(current.publicationDay) > maxDay
          ? ""
          : current.publicationDay;

      return {
        ...current,
        publicationYearInput: normalizedValue,
        publicationDay: nextPublicationDay,
      };
    });
  }

  function updatePublicationMonth(value: string) {
    setEditForm((current) => {
      if (!current) {
        return current;
      }

      const maxDay = getDaysInMonth(current.publicationYearInput, value);
      const nextPublicationDay =
        current.publicationDay && Number(current.publicationDay) > maxDay
          ? ""
          : current.publicationDay;

      return {
        ...current,
        publicationMonth: value,
        publicationDay: nextPublicationDay,
      };
    });
  }

  function openDeleteModal(bookId: string, title: string) {
    setFeedback("");
    setDeleteCandidate({ id: bookId, title });
  }

  async function handleDelete() {
    if (!deleteCandidate) {
      return;
    }

    const { id: bookId } = deleteCandidate;

    setFeedback("");
    setPendingDeleteId(bookId);

    try {
      const response = await fetch(`/api/admin/books/${bookId}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setFeedback(payload?.message ?? "A könyv törlése nem sikerült.");
        return;
      }

      setLocalBooks((current) => current.filter((book) => book.id !== bookId));
      setStatusById((current) => {
        const next = { ...current };
        delete next[bookId];
        return next;
      });
      setFeedback(payload?.message ?? "A könyv sikeresen törölve lett.");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback("Hálózati hiba történt a törlés közben.");
    } finally {
      setPendingDeleteId("");
      setDeleteCandidate(null);
    }
  }


  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editForm || !editingBookId) {
      return;
    }

    const trimmedTitle = editForm.title.trim();

    if (!trimmedTitle) {
      setEditFeedback("A könyv címének megadása kötelező.");
      return;
    }

    const pageCountResult = parseOptionalInteger(editForm.pageCount);

    if (!pageCountResult.ok) {
      setEditFeedback("Az oldalszám csak nem negatív egész szám lehet.");
      return;
    }

    const priceResult = parseOptionalDecimal(editForm.price);

    if (!priceResult.ok) {
      setEditFeedback("Az ár csak nem negatív szám lehet.");
      return;
    }

    const normalizedLanguage = normalizeBookLanguage(editForm.language);

    if (!normalizedLanguage) {
      setEditFeedback("Válassz nyelvet a listából.");
      return;
    }

    const publicationDateResult = buildPublicationDate(
      editForm.publicationYearInput,
      editForm.publicationMonth,
      editForm.publicationDay,
    );

    if (!publicationDateResult.ok) {
      setEditFeedback(publicationDateResult.message);
      return;
    }

    if (!editForm.sizePreset) {
      setEditFeedback("Válassz méretet a listából.");
      return;
    }

    const normalizedSize =
      editForm.sizePreset === "egyedi"
        ? formatCustomBookSize(editForm.customWidth, editForm.customHeight)
        : editForm.sizePreset;

    if (!normalizedSize) {
      setEditFeedback("Az egyedi mérethez adj meg érvényes szélességet és magasságot cm-ben.");
      return;
    }

    const nextBook = {
      title: trimmedTitle,
      author: editForm.author.trim(),
      language: normalizedLanguage,
      description: normalizeRichTextToPlainText(editForm.description),
      publicationYear: getPublicationYearFromDate(publicationDateResult.value),
      publicationDate: publicationDateResult.value,
      isbn: formatBookIsbn(editForm.isbn),
      pageCount: pageCountResult.value,
      keywords: normalizeKeywords(editForm.keywords),
      size: normalizedSize,
      price: priceResult.value,
      coverImageUrl: editForm.coverImageUrl.trim(),
      status: editForm.status,
    };

    const { publicationYear, ...requestBody } = nextBook;
    void publicationYear;

    setFeedback("");
    setEditFeedback("");
    setIsSavingEdit(true);

    try {
      const isCreateRequest = editingBookId === NEW_BOOK_ID;
      const response = await fetch(
        isCreateRequest ? "/api/admin/books" : `/api/admin/books/${editingBookId}`,
        {
          method: isCreateRequest ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...requestBody,
            publicationDate: nextBook.publicationDate || null,
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; book?: AdminBookListItem }
        | null;

      if (!response.ok) {
        setEditFeedback(payload?.message ?? "A könyv mentése nem sikerült.");
        return;
      }

      if (isCreateRequest) {
        const createdBook = payload?.book;

        if (createdBook) {
          setLocalBooks((current) => sortAdminBooks([createdBook, ...current]));
          setStatusById((current) => ({
            ...current,
            [createdBook.id]: createdBook.status,
          }));
        }

        setFeedback(payload?.message ?? "Az új könyv sikeresen létrejött.");
      } else {
        setLocalBooks((current) =>
          sortAdminBooks(
            current.map((book) =>
              book.id === editingBookId
                ? {
                    ...book,
                    ...nextBook,
                    publicationDate: nextBook.publicationDate,
                  }
                : book,
            ),
          ),
        );
        setStatusById((current) => ({
          ...current,
          [editingBookId]: nextBook.status,
        }));
        setFeedback(payload?.message ?? "A könyv adatai sikeresen frissültek.");
      }

      setEditingBookId("");
      setEditForm(null);
      setCoverUploadMessage("");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setEditFeedback("Hálózati hiba történt a könyv mentése közben.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  const filteredBooks = localBooks.filter((book) => {
    const normalizedQuery = normalizeSearchValue(searchQuery);
    const haystack = normalizeSearchValue([
      book.title,
      book.author,
      ...book.keywords,
    ].join(" "));
    const matchesSearch = normalizedQuery.length === 0 || haystack.includes(normalizedQuery);

    if (!matchesSearch) {
      return false;
    }

    if (statusFilter === "all") {
      return true;
    }

    return (statusById[book.id] ?? book.status) === statusFilter;
  });

  return (
    <>
      <div className="admin-content">
        <div className="admin-card">
          <p className="eyebrow">Könyvek</p>
          <h3>Könyvlista</h3>
          <div className={styles.toolbar}>
            <div className={styles.toolbarInfo}>
              <p className={styles.countText}>
                {filteredBooks.length} / {localBooks.length} könyv látható a listában.
              </p>
              <div className={styles.buttonRow}>
                <button
                  type="button"
                  className={styles.createButton}
                  onClick={openCreateModal}
                  disabled={isEditBusy || Boolean(pendingDeleteId)}
                >
                  Új könyv feltöltése
                </button>
                <button
                  type="button"
                  className={styles.createButton}
                  onClick={openPriceManagementPage}
                  disabled={isEditBusy || Boolean(pendingDeleteId)}
                >
                  Árak változtatása
                </button>
              </div>
            </div>
            <div className={styles.toolbarControls}>
              <label className={styles.filterField}>
                <span>Keresés cím, szerző vagy kulcsszó alapján</span>
                <input suppressHydrationWarning
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Kezdd el beírni a címet, szerzőt vagy kulcsszót"
                  className={styles.searchInput}
                />
              </label>
              <label className={styles.filterField}>
                <span>Szűrés státusz szerint</span>
                <select suppressHydrationWarning
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as BookStatusFilter)
                  }
                  className={styles.filterSelect}
                >
                  <option value="all">Összes státusz</option>
                  {BOOK_STATUS_VALUES.map((status) => (
                    <option key={status} value={status}>
                      {BOOK_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
        </div>

        <div className={styles.list}>
          {filteredBooks.map((book) => {
            const coverSrc = book.coverImageUrl || "/book-placeholder.svg";
            const isDeleting = pendingDeleteId === book.id;
            const currentStatus = statusById[book.id] ?? book.status;
            const isDraft = currentStatus === "draft";

            return (
              <article
                key={book.id}
                className={isDraft ? `${styles.card} ${styles.cardDraft}` : styles.card}
              >
                <div className={styles.coverWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverSrc}
                    alt={`${book.title} borító`}
                    className={isDraft ? `${styles.cover} ${styles.coverDraft}` : styles.cover}
                  />
                </div>

                <div className={styles.meta}>
                  <p className={styles.author}>{book.author || "Szerző nincs megadva"}</p>
                  <h4 className={styles.title}>{book.title}</h4>
                  <div className={styles.details}>
                    <span>Kiadási év: {formatPublicationYear(book.publicationYear)}</span>
                    <span>Ár: {formatPrice(book.price)}</span>
                  </div>
                  {isDraft ? (
                    <p className={styles.draftHint}>Ez a könyv nincs publikálva az oldalon.</p>
                  ) : null}
                  <p className={styles.statusField}>
                    Státusz: <strong className={styles.statusValue}>{BOOK_STATUS_LABELS[currentStatus]}</strong>
                  </p>
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={() => openEditModal({ ...book, status: currentStatus })}
                    disabled={isDeleting || isPending || isSavingEdit || isEditOpen}
                  >
                    Módosítás
                  </button>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => openDeleteModal(book.id, book.title)}
                    disabled={isDeleting || isPending || isSavingEdit || isEditOpen}
                  >
                    {isDeleting ? "Törlés..." : "Törlés"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {isEditOpen && editForm ? (
        <div className={styles.modalBackdrop} onClick={closeEditModal}>
          <div
            className={styles.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-book-edit-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className="eyebrow">{isCreatingBook ? "Új könyv" : "Könyv szerkesztése"}</p>
                <h3 id="admin-book-edit-title">
                  {isCreatingBook
                    ? "Új könyv feltöltése"
                    : editingBook?.title || editForm.title || "Könyv szerkesztése"}
                </h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={closeEditModal}
                disabled={isEditBusy}
                aria-label="Modal bezárása"
              >
                Bezárás
              </button>
            </div>

            <form
              className={styles.modalForm}
              onSubmit={(event) => {
                void handleEditSubmit(event);
              }}
            >
              <div className={styles.modalGrid}>
                <label className={`${styles.modalField} ${styles.modalFieldWide}`}>
                  <span>Cím</span>
                  <input suppressHydrationWarning
                    type="text"
                    value={editForm.title}
                    onChange={(event) => updateEditField("title", event.target.value)}
                    className={styles.modalInput}
                    disabled={isSavingEdit || isPending}
                    required
                  />
                </label>

                <label className={styles.modalField}>
                  <span>Szerző</span>
                  <input suppressHydrationWarning
                    type="text"
                    value={editForm.author}
                    onChange={(event) => updateEditField("author", event.target.value)}
                    className={styles.modalInput}
                    disabled={isEditBusy}
                  />
                </label>

                <label className={styles.modalField}>
                  <span>Nyelv</span>
                  <select suppressHydrationWarning
                    value={editForm.language}
                    onChange={(event) => updateEditField("language", event.target.value)}
                    className={styles.modalInput}
                    disabled={isSavingEdit || isPending}
                    required
                  >
                    {BOOK_LANGUAGE_VALUES.map((language) => (
                      <option key={language} value={language}>
                        {BOOK_LANGUAGE_LABELS[language]}
                      </option>
                    ))}
                  </select>
                </label>

                <div className={styles.modalField}>
                  <span>Kiadási dátum</span>
                  <div className={styles.dateFields}>
                    <label className={styles.dateSubField}>
                      <span>Év</span>
                      <input suppressHydrationWarning
                        type="text"
                        inputMode="text"
                        placeholder="2025"
                        value={editForm.publicationYearInput}
                        onChange={(event) =>
                          updatePublicationYearInput(event.target.value)
                        }
                        className={styles.modalInput}
                        disabled={isSavingEdit || isPending}
                      />
                    </label>

                    <label className={styles.dateSubField}>
                      <span>Hónap</span>
                      <select suppressHydrationWarning
                        value={editForm.publicationMonth}
                        onChange={(event) => updatePublicationMonth(event.target.value)}
                        className={styles.modalInput}
                        disabled={isSavingEdit || isPending}
                      >
                        <option value="">Válassz</option>
                        {BOOK_MONTH_OPTIONS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={styles.dateSubField}>
                      <span>Nap</span>
                      <select suppressHydrationWarning
                        value={editForm.publicationDay}
                        onChange={(event) =>
                          updateEditField("publicationDay", event.target.value)
                        }
                        className={styles.modalInput}
                        disabled={isEditBusy || !editForm.publicationMonth}
                      >
                        <option value="">Válassz</option>
                        {Array.from(
                          {
                            length: getDaysInMonth(
                              editForm.publicationYearInput,
                              editForm.publicationMonth,
                            ),
                          },
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



                <label className={styles.modalField}>
                  <span>ISBN</span>
                  <input suppressHydrationWarning
                    type="text"
                    inputMode="text"
                    placeholder="978-606-556-043-7"
                    value={editForm.isbn}
                    onChange={(event) =>
                      updateEditField("isbn", sanitizeBookIsbnInput(event.target.value))
                    }
                    className={styles.modalInput}
                    disabled={isEditBusy}
                  />
                </label>

                <div className={`${styles.modalFieldWide} ${styles.fieldPair}`}>
                  <label className={styles.modalField}>
                    <span>Oldalszám</span>
                    <input suppressHydrationWarning
                      type="number"
                      min="0"
                      step="1"
                      value={editForm.pageCount}
                      onChange={(event) => updateEditField("pageCount", event.target.value)}
                      className={styles.modalInput}
                      disabled={isSavingEdit || isPending}
                    />
                  </label>

                  <div className={styles.modalField}>
                    <span>Méret</span>
                    <select suppressHydrationWarning
                      value={editForm.sizePreset}
                      onChange={(event) =>
                        updateSizePreset(event.target.value as EditFormState["sizePreset"])
                      }
                      className={styles.modalInput}
                      disabled={isSavingEdit || isPending}
                    >
                      <option value="">Válassz</option>
                      {BOOK_SIZE_PRESET_VALUES.map((sizePreset) => (
                        <option key={sizePreset} value={sizePreset}>
                          {BOOK_SIZE_PRESET_LABELS[sizePreset]}
                        </option>
                      ))}
                    </select>

                    <div className={styles.sizeFields}>
                      <label className={styles.dateSubField}>
                        <span>Szélesség (cm)</span>
                        <input suppressHydrationWarning
                          type="text"
                          inputMode="decimal"
                          placeholder="14.8"
                          value={editForm.customWidth}
                          onChange={(event) =>
                            updateEditField(
                              "customWidth",
                              sanitizeBookSizeDimensionInput(event.target.value),
                            )
                          }
                          className={styles.modalInput}
                          disabled={isEditBusy || editForm.sizePreset !== "egyedi"}
                        />
                      </label>

                      <label className={styles.dateSubField}>
                        <span>Magasság (cm)</span>
                        <input suppressHydrationWarning
                          type="text"
                          inputMode="decimal"
                          placeholder="21"
                          value={editForm.customHeight}
                          onChange={(event) =>
                            updateEditField(
                              "customHeight",
                              sanitizeBookSizeDimensionInput(event.target.value),
                            )
                          }
                          className={styles.modalInput}
                          disabled={isEditBusy || editForm.sizePreset !== "egyedi"}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <label className={styles.modalField}>
                  <span>Ár (RON)</span>
                  <input suppressHydrationWarning
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.price}
                    onChange={(event) => updateEditField("price", event.target.value)}
                    className={styles.modalInput}
                    disabled={isEditBusy}
                  />
                </label>

                <label className={styles.modalField}>
                  <span>Státusz</span>
                  <select suppressHydrationWarning
                    value={editForm.status}
                    onChange={(event) =>
                      updateEditField("status", event.target.value as BookStatus)
                    }
                    className={styles.modalInput}
                    disabled={isEditBusy}
                  >
                    {BOOK_STATUS_VALUES.map((status) => (
                      <option key={status} value={status}>
                        {BOOK_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>

                <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
                  <span>Borítókép</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                    onChange={(event) => {
                      void handleCoverUpload(event);
                    }}
                    className={`${styles.modalInput} ${styles.fileInput}`}
                    disabled={isEditBusy}
                  />
                  <span className={styles.modalHint}>
                    A JPEG, PNG és WEBP képeket feltöltés előtt automatikusan optimalizáljuk. A végleges fájl legfeljebb 5 MB lehet.
                  </span>
                  {editForm.coverImageUrl ? (
                    <div className={styles.coverUploadPreview}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={editForm.coverImageUrl}
                        alt={`${editForm.title} borítókép előnézet`}
                        className={styles.coverUploadPreviewImage}
                      />
                      <div className={styles.coverActions}>
                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={() => {
                            void handleCoverDelete();
                          }}
                          disabled={isEditBusy}
                        >
                          {isDeletingCover ? "Törlés folyamatban..." : "Borítókép törlése"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {isUploadingCover ? (
                    <span className={styles.modalHint}>A borítókép feltöltése folyamatban...</span>
                  ) : null}
                  {isDeletingCover ? (
                    <span className={styles.modalHint}>A borítókép törlése folyamatban...</span>
                  ) : null}
                  {coverUploadMessage ? (
                    <p className={styles.modalInfo}>{coverUploadMessage}</p>
                  ) : null}
                </div>

                <label className={`${styles.modalField} ${styles.modalFieldWide}`}>
                  <span>Kulcsszavak</span>
                  <input suppressHydrationWarning
                    type="text"
                    value={editForm.keywords}
                    onChange={(event) => updateEditField("keywords", event.target.value)}
                    placeholder="pl. költészet, esszé, kortárs"
                    className={styles.modalInput}
                    disabled={isEditBusy}
                  />
                </label>

                <label className={`${styles.modalField} ${styles.modalFieldWide}`}>
                  <span>Leírás</span>
                  <span className={styles.modalHint}>
                    Minden Enter új bekezdést jelent.
                  </span>
                  <textarea suppressHydrationWarning
                    value={editForm.description}
                    onChange={(event) =>
                      updateEditField("description", event.target.value)
                    }
                    className={`${styles.modalTextarea} ${styles.descriptionEditor}`}
                    disabled={isEditBusy}
                    rows={6}
                  />
                </label>

              </div>

              {editFeedback ? <p className={styles.modalFeedback}>{editFeedback}</p> : null}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalCancelButton}
                  onClick={closeEditModal}
                  disabled={isEditBusy}
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className={styles.modalSaveButton}
                  disabled={isEditBusy}
                >
                  {isSavingEdit
                    ? isCreatingBook
                      ? "Létrehozás folyamatban..."
                      : "Mentés folyamatban..."
                    : isUploadingCover
                      ? "Feltöltés folyamatban..."
                      : isDeletingCover
                        ? "Törlés folyamatban..."
                        : isCreatingBook
                          ? "Könyv létrehozása"
                          : "Mentés"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isDeleteModalOpen && deleteCandidate ? (
        <div className={styles.modalBackdrop} onClick={closeDeleteModal}>
          <div
            className={`${styles.modalPanel} ${styles.confirmPanel}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-book-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className="eyebrow">Könyv törlése</p>
                <h3 id="admin-book-delete-title">Biztosan törlöd ezt a könyvet?</h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={closeDeleteModal}
                disabled={Boolean(pendingDeleteId)}
                aria-label="Törlés megerősítő ablak bezárása"
              >
                Bezárás
              </button>
            </div>

            <p className={styles.confirmText}>
              A következő könyv végleg törlődik a listából: <strong>{deleteCandidate.title}</strong>
            </p>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelButton}
                onClick={closeDeleteModal}
                disabled={Boolean(pendingDeleteId)}
              >
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
                {pendingDeleteId ? "Törlés folyamatban..." : "Könyv törlése"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}






























