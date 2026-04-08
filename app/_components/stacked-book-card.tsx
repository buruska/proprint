"use client";

import { useEffect, useId, useState } from "react";

import { useCart } from "@/app/_components/cart-context";
import { BOOK_STATUS_LABELS, type BookStatus } from "@/lib/book-status";
import { formatCurrency } from "@/lib/utils";

import styles from "./stacked-book-card.module.css";

type StackedBookCardProps = {
  id: string;
  title: string;
  author: string;
  price: number;
  status: BookStatus;
  description?: string;
  publicationYear?: number | null;
  isbn?: string;
  pageCount?: number | null;
  size?: string;
  coverImageUrl?: string;
};

type ActiveDialog = "details" | "cart" | null;

function getActionLabel(status: BookStatus) {
  if (status === "in-stock") {
    return "Kosárba";
  }

  if (status === "preorder") {
    return "Előrendelem";
  }

  return null;
}

function clampQuantity(quantity: number) {
  if (quantity < 1) {
    return 1;
  }

  if (quantity > 99) {
    return 99;
  }

  return quantity;
}

const stackFallbackStyle = {
  position: "relative",
  display: "inline-block",
  width: "min(100%, 280px)",
  aspectRatio: "0.72",
} as const;

const cardFallbackStyle = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
} as const;

const cardInnerFallbackStyle = {
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr) auto",
  gap: "18px",
  width: "100%",
  height: "100%",
  padding: "18px",
} as const;

const coverFrameFallbackStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
} as const;

const coverImageFallbackStyle = {
  display: "block",
  width: "100%",
  height: "100%",
  objectFit: "contain",
} as const;
export function StackedBookCard({
  id,
  title,
  author,
  price,
  status,
  description,
  publicationYear,
  isbn,
  pageCount,
  size,
  coverImageUrl,
}: StackedBookCardProps) {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const detailsDialogTitleId = useId();
  const cartDialogTitleId = useId();
  const actionLabel = getActionLabel(status);
  const isUnavailable = status === "unavailable";
  const resolvedCoverImageUrl = coverImageUrl?.trim() || "/book-placeholder.svg";
  const hasMetadata = publicationYear || isbn || pageCount || size || status;
  const { addItem } = useCart();

  useEffect(() => {
    if (!activeDialog) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveDialog(null);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDialog]);

  function openCartDialog() {
    setSelectedQuantity(1);
    setActiveDialog("cart");
  }

  function changeQuantity(nextQuantity: number) {
    setSelectedQuantity(clampQuantity(nextQuantity));
  }

  function handleAddToCart() {
    addItem(
      {
        id,
        title,
        author,
        price,
        coverImageUrl: resolvedCoverImageUrl,
        status,
      },
      selectedQuantity,
    );

    setActiveDialog(null);
    setSelectedQuantity(1);
  }

  return (
    <>
      <div className={isUnavailable ? `${styles.stack} ${styles.stackUnavailable}` : styles.stack} style={stackFallbackStyle}>
        <span className={`${styles.layer} ${styles.layerBack}`} aria-hidden="true" />
        <span className={`${styles.layer} ${styles.layerMiddle}`} aria-hidden="true" />

        <article className={styles.card} style={cardFallbackStyle}>
          <div className={styles.cardInner} style={cardInnerFallbackStyle}>
            <div className={styles.coverFrame} style={coverFrameFallbackStyle}>
              {
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvedCoverImageUrl}
                  alt={`${title} borítója`}
                  className={styles.coverImage}
                  style={coverImageFallbackStyle}
                />
              }
            </div>

            <div className={styles.meta}>
              <p className={styles.author}>{author}</p>
              <h3 className={styles.title}>{title}</h3>
              {!isUnavailable ? <p className={styles.price}>{formatCurrency(price)}</p> : null}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  onClick={() => setActiveDialog("details")}
                >
                  Részletek
                </button>
                {actionLabel ? (
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonPrimary}`}
                    onClick={openCartDialog}
                  >
                    {actionLabel}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </article>
      </div>

      {activeDialog === "details" ? (
        <div className={styles.modalBackdrop} onClick={() => setActiveDialog(null)}>
          <div
            className={styles.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={detailsDialogTitleId}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.modalCloseButton}
              onClick={() => setActiveDialog(null)}
              aria-label="Részletek bezárása"
            >
              Bezárás
            </button>

            <div className={styles.modalLayout}>
              <div className={styles.modalCoverWrap}>
                {
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolvedCoverImageUrl}
                    alt={`${title} borítója`}
                    className={styles.modalCoverImage}
                  />
                }
              </div>

              <div className={styles.modalContent}>
                <p className="eyebrow">Könyvrészletek</p>
                <h3 id={detailsDialogTitleId} className={styles.modalTitle}>{title}</h3>
                <p className={styles.modalAuthor}>{author}</p>
                <p className={styles.modalPrice}>{formatCurrency(price)}</p>

                {description ? <p className={styles.modalDescription}>{description}</p> : null}

                {hasMetadata ? (
                  <dl className={styles.modalMetaList}>
                    {publicationYear ? (
                      <>
                        <dt>Megjelenés</dt>
                        <dd>{publicationYear}</dd>
                      </>
                    ) : null}
                    {isbn ? (
                      <>
                        <dt>ISBN</dt>
                        <dd>{isbn}</dd>
                      </>
                    ) : null}
                    {pageCount ? (
                      <>
                        <dt>Oldalszám</dt>
                        <dd>{pageCount}</dd>
                      </>
                    ) : null}
                    {size ? (
                      <>
                        <dt>Méret</dt>
                        <dd>{size}</dd>
                      </>
                    ) : null}
                    <>
                      <dt>Státusz</dt>
                      <dd>{BOOK_STATUS_LABELS[status]}</dd>
                    </>
                  </dl>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeDialog === "cart" ? (
        <div className={styles.modalBackdrop} onClick={() => setActiveDialog(null)}>
          <div
            className={styles.cartModalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={cartDialogTitleId}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.modalCloseButton}
              onClick={() => setActiveDialog(null)}
              aria-label="Kosárba helyezés bezárása"
            >
              Bezárás
            </button>

            <div className={styles.cartModalLayout}>
              <div className={styles.cartModalCoverWrap}>
                {
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolvedCoverImageUrl}
                    alt={`${title} borítója`}
                    className={styles.cartModalCoverImage}
                  />
                }
              </div>

              <div className={styles.cartModalContent}>
                <p className="eyebrow">Kosár</p>
                <h3 id={cartDialogTitleId} className={styles.cartModalTitle}>{title}</h3>
                <p className={styles.cartModalAuthor}>{author}</p>
                <p className={styles.cartModalPrice}>{formatCurrency(price)}</p>
                <p className={styles.cartModalText}>
                  Válaszd ki, hány darabot szeretnél a kosárba helyezni.
                </p>

                <div className={styles.quantityPicker}>
                  <button
                    type="button"
                    className={styles.quantityButton}
                    onClick={() => changeQuantity(selectedQuantity - 1)}
                    aria-label="Mennyiség csökkentése"
                  >
                    -
                  </button>
                  <span className={styles.quantityValue}>{selectedQuantity}</span>
                  <button
                    type="button"
                    className={styles.quantityButton}
                    onClick={() => changeQuantity(selectedQuantity + 1)}
                    aria-label="Mennyiség növelése"
                  >
                    +
                  </button>
                </div>

                <p className={styles.cartModalSummary}>
                  Összesen: <strong>{formatCurrency(price * selectedQuantity)}</strong>
                </p>

                <div className={styles.cartModalActions}>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    onClick={() => setActiveDialog(null)}
                  >
                    Mégse
                  </button>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonPrimary}`}
                    onClick={handleAddToCart}
                  >
                    {actionLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}


