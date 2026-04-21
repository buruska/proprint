"use client";

import { useEffect, useState } from "react";

import styles from "./page.module.css";

type HandmadeGalleryProps = {
  imageUrls: string[];
};

export function HandmadeGallery({ imageUrls }: HandmadeGalleryProps) {
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const hasMultipleImages = imageUrls.length > 1;

  function showPreviousImage() {
    setActiveImageIndex((current) => {
      if (current === null) {
        return current;
      }

      return current === 0 ? imageUrls.length - 1 : current - 1;
    });
  }

  function showNextImage() {
    setActiveImageIndex((current) => {
      if (current === null) {
        return current;
      }

      return current === imageUrls.length - 1 ? 0 : current + 1;
    });
  }

  useEffect(() => {
    if (activeImageIndex === null) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveImageIndex(null);
        return;
      }

      if (event.key === "ArrowLeft" && hasMultipleImages) {
        setActiveImageIndex((current) => {
          if (current === null) {
            return current;
          }

          return current === 0 ? imageUrls.length - 1 : current - 1;
        });
        return;
      }

      if (event.key === "ArrowRight" && hasMultipleImages) {
        setActiveImageIndex((current) => {
          if (current === null) {
            return current;
          }

          return current === imageUrls.length - 1 ? 0 : current + 1;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeImageIndex, hasMultipleImages, imageUrls.length]);

  const activeImageUrl = activeImageIndex === null ? null : imageUrls[activeImageIndex] ?? null;
  const activeImageNumber = activeImageIndex === null ? null : activeImageIndex + 1;

  return (
    <>
      <div className={styles.galleryGrid}>
        {imageUrls.map((imageUrl, index) => (
          <button
            key={`${imageUrl}-${index}`}
            type="button"
            className={`${styles.galleryItem} ${styles[`galleryItem${(index % 5) + 1}`]}`}
            onClick={() => setActiveImageIndex(index)}
            aria-label={`Handmade alkotás ${index + 1}. megnyitása`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`Handmade alkotás ${index + 1}.`}
              className={styles.galleryImage}
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {activeImageUrl ? (
        <div className={styles.modalBackdrop} onClick={() => setActiveImageIndex(null)}>
          <div
            className={styles.imageModalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="handmade-image-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.modalCloseButton}
              onClick={() => setActiveImageIndex(null)}
              aria-label="Kép bezárása"
            >
              Bezárás
            </button>

            <p id="handmade-image-modal-title" className="eyebrow">
              Galéria
            </p>

            {hasMultipleImages ? (
              <div className={styles.imageModalToolbar}>
                <button
                  type="button"
                  className={styles.modalNavButton}
                  onClick={showPreviousImage}
                  aria-label="Előző kép"
                >
                  Előző
                </button>
                <p className={styles.imageModalCounter}>
                  {activeImageNumber}. / {imageUrls.length}.
                </p>
                <button
                  type="button"
                  className={styles.modalNavButton}
                  onClick={showNextImage}
                  aria-label="Következő kép"
                >
                  Következő
                </button>
              </div>
            ) : null}

            <div className={styles.imageModalFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImageUrl}
                alt={`Handmade alkotás ${activeImageNumber}.`}
                className={styles.imageModalImage}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
