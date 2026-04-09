"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { BOOK_STATUS_LABELS, type BookStatus } from "@/lib/book-status";
import { normalizeSearchValue } from "@/lib/utils";

import { StackedBookCard } from "./stacked-book-card";
import styles from "./public-books-grid.module.css";

type PublicBookListItem = {
  id: string;
  title: string;
  author: string;
  description: string;
  publicationYear: number | null;
  publicationDate: string;
  isbn: string;
  pageCount: number | null;
  size: string;
  price: number;
  coverImageUrl: string;
  keywords: string[];
  status: BookStatus;
};

type PublicEbookListItem = {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string;
  pdfUrl: string;
  epubUrl: string;
  mobiUrl: string;
};

type PublicBooksGridProps = {
  books: PublicBookListItem[];
  ebooks: PublicEbookListItem[];
};

type VisibleBookStatus = Extract<BookStatus, "in-stock" | "preorder" | "unavailable">;
type SortValue = "publication-date" | "author" | "title";

const FILTER_OPTIONS: Array<{ value: VisibleBookStatus; label: string }> = [
  { value: "in-stock", label: BOOK_STATUS_LABELS["in-stock"] },
  { value: "preorder", label: BOOK_STATUS_LABELS.preorder },
  { value: "unavailable", label: BOOK_STATUS_LABELS.unavailable },
];

const SORT_OPTIONS: Array<{ value: SortValue; label: string }> = [
  { value: "publication-date", label: "Kiadási dátum" },
  { value: "author", label: "Szerző" },
  { value: "title", label: "Cím" },
];

function getPublicationTimestamp(book: PublicBookListItem) {
  if (book.publicationDate) {
    const timestamp = Date.parse(book.publicationDate);
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  if (typeof book.publicationYear === "number") {
    return Date.UTC(book.publicationYear, 0, 1);
  }

  return 0;
}



export function PublicBooksGrid({ books, ebooks }: PublicBooksGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeFilters, setActiveFilters] = useState<VisibleBookStatus[]>(
    FILTER_OPTIONS.map((option) => option.value),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortValue>("publication-date");
  const [isEbooksModalOpen, setIsEbooksModalOpen] = useState(false);
  const [isOrderSuccessDismissed, setIsOrderSuccessDismissed] = useState(false);

  const allSelected = activeFilters.length === FILTER_OPTIONS.length;
  const hasOrderSuccess = searchParams.get("orderSuccess") === "1";
  const isOrderSuccessOpen = hasOrderSuccess && !isOrderSuccessDismissed;
  const isAnyModalOpen = isOrderSuccessOpen || isEbooksModalOpen;

  const closeEbooksModal = useCallback(() => {
    setIsEbooksModalOpen(false);
  }, []);

  const closeOrderSuccessModal = useCallback(() => {
    setIsOrderSuccessDismissed(true);
    router.replace("/books");
  }, [router]);

  useEffect(() => {
    if (!isAnyModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (isEbooksModalOpen) {
        closeEbooksModal();
        return;
      }

      closeOrderSuccessModal();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeEbooksModal, closeOrderSuccessModal, isAnyModalOpen, isEbooksModalOpen]);

  const filteredBooks = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(searchQuery);

    const nextBooks = books.filter((book) => {
      const matchesStatus = activeFilters.includes(book.status as VisibleBookStatus);

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = normalizeSearchValue([
        book.title,
        book.author,
        ...book.keywords,
      ].join(" "));

      return haystack.includes(normalizedQuery);
    });

    nextBooks.sort((left, right) => {
      if (sortBy === "author") {
        return left.author.localeCompare(right.author, "hu-HU");
      }

      if (sortBy === "title") {
        return left.title.localeCompare(right.title, "hu-HU");
      }

      return getPublicationTimestamp(right) - getPublicationTimestamp(left);
    });

    return nextBooks;
  }, [activeFilters, books, searchQuery, sortBy]);

  function toggleFilter(filter: VisibleBookStatus) {
    setActiveFilters((current) =>
      current.includes(filter)
        ? current.filter((value) => value !== filter)
        : [...current, filter],
    );
  }

  function toggleAllFilters() {
    setActiveFilters((current) =>
      current.length === FILTER_OPTIONS.length
        ? []
        : FILTER_OPTIONS.map((option) => option.value),
    );
  }

  return (
    <>
      <div className={styles.section}>
        <div className={styles.controls}>
          <div className={styles.topControls}>
            <label className={styles.searchField}>
              <span>Keresés cím, szerző vagy kulcsszó alapján</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Kezdd el beírni a címet, szerzőt vagy kulcsszót"
                className={styles.searchInput}
              />
            </label>

            <div className={styles.controlsAside}>
              <button
                type="button"
                className={styles.ebooksButton}
                onClick={() => setIsEbooksModalOpen(true)}
              >
                E-könyvek
              </button>

              <label className={styles.sortField}>
                <span>Rendezés</span>
                <div className={styles.sortControl}>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortValue)}
                    className={styles.sortSelect}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>
          </div>

          <div className={styles.filterRow}>
            <div className={styles.filters} aria-label="Szűrés státusz szerint">
              <label className={allSelected ? styles.filterCheckboxActive : styles.filterCheckbox}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAllFilters}
                />
                <span>Mind</span>
              </label>

              {FILTER_OPTIONS.map((option) => {
                const isChecked = activeFilters.includes(option.value);

                return (
                  <label
                    key={option.value}
                    className={isChecked ? styles.filterCheckboxActive : styles.filterCheckbox}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleFilter(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>

            <p className={styles.resultCount}>{filteredBooks.length} könyv</p>
          </div>
        </div>

        {filteredBooks.length > 0 ? (
          <div className={styles.grid}>
            {filteredBooks.map((book) => (
              <StackedBookCard
                key={book.id}
                id={book.id}
                author={book.author}
                title={book.title}
                description={book.description}
                publicationYear={book.publicationYear}
                isbn={book.isbn}
                pageCount={book.pageCount}
                size={book.size}
                price={book.price}
                status={book.status}
                coverImageUrl={book.coverImageUrl}
              />
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>Nincs a keresésnek vagy a kiválasztott kategóriáknak megfelelő könyv.</p>
        )}
      </div>

      {isEbooksModalOpen ? (
        <div className={styles.modalBackdrop} onClick={closeEbooksModal}>
          <div
            className={`${styles.modalPanel} ${styles.ebooksModalPanel}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ebooks-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.modalCloseButton}
              onClick={closeEbooksModal}
            >
              Bezárás
            </button>
            <h2 id="ebooks-title" className={styles.modalTitle}>
              E-könyvek
            </h2>

            {ebooks.length === 0 ? (
              <p className={styles.modalText}>Jelenleg nincs elérhető e-könyv a kínálatban.</p>
            ) : (
              <div className={styles.ebooksList}>
                {ebooks.map((ebook) => (
                  <article key={ebook.id} className={styles.ebookCard}>
                    <div className={styles.ebookCoverWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ebook.coverImageUrl || "/book-placeholder.svg"}
                        alt={`${ebook.title} borító`}
                        className={styles.ebookCover}
                      />
                    </div>

                    <div className={styles.ebookMeta}>
                      <p className={styles.ebookAuthor}>{ebook.author || "Szerző nélkül"}</p>
                      <h3 className={styles.ebookTitle}>{ebook.title}</h3>
                      <div className={styles.ebookFormats}>
                        {ebook.pdfUrl ? (
                          <a href={ebook.pdfUrl} target="_blank" rel="noreferrer" className={styles.ebookLink}>
                            PDF
                          </a>
                        ) : null}
                        {ebook.epubUrl ? (
                          <a href={ebook.epubUrl} target="_blank" rel="noreferrer" className={styles.ebookLink}>
                            EPUB
                          </a>
                        ) : null}
                        {ebook.mobiUrl ? (
                          <a href={ebook.mobiUrl} target="_blank" rel="noreferrer" className={styles.ebookLink}>
                            MOBI
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {isOrderSuccessOpen ? (
        <div className={styles.modalBackdrop} onClick={closeOrderSuccessModal}>
          <div
            className={styles.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-success-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">Rendelés rögzítve</p>
            <h2 id="order-success-title" className={styles.modalTitle}>
              Rendelését rögzítettük
            </h2>
            <p className={styles.modalText}>
              Kollégánk hamarosan felveszi Önnel a kapcsolatot.
            </p>
            <button
              type="button"
              className={styles.modalButton}
              onClick={closeOrderSuccessModal}
            >
              Rendben
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}



