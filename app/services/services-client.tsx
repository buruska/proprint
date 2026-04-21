"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./page.module.css";

type ServiceCard = {
  id: string;
  title: string;
  coverImageUrl: string;
  pricingText: string;
};

const serviceVisuals: Record<string, { coverLabel: string; accent: string }> = {
  stamps: { coverLabel: "PRO-PRINT", accent: "forest" },
  "copy-print": { coverLabel: "MÁSOLAT", accent: "paper" },
  "laser-engraving": { coverLabel: "GRAVÍR", accent: "copper" },
  "thesis-binding": { coverLabel: "BEKÖTÉS", accent: "midnight" },
};

export function ServicesClient({ cards }: { cards: ServiceCard[] }) {
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeServiceId) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveServiceId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeServiceId]);

  const activeService = useMemo(
    () => cards.find((card) => card.id === activeServiceId) ?? null,
    [activeServiceId, cards],
  );

  return (
    <>
      <section className="section">
        <div className="shell">
          <div className={styles.grid}>
            {cards.map((service) => {
              const visual = serviceVisuals[service.id] ?? {
                coverLabel: "PRO-PRINT",
                accent: "forest",
              };

              return (
                <div key={service.id} className={styles.stack}>
                  <span className={`${styles.layer} ${styles.layerBack}`} aria-hidden="true" />
                  <span className={`${styles.layer} ${styles.layerMiddle}`} aria-hidden="true" />

                  <article className={styles.card}>
                    <div className={styles.cardInner}>
                      <div className={`${styles.coverFrame} ${styles[`coverFrame--${visual.accent}`]}`}>
                        {service.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={service.coverImageUrl}
                            alt={`${service.title} borítóképe`}
                            className={styles.coverImage}
                          />
                        ) : (
                          <div className={styles.coverArt}>
                            <span className={styles.coverTag}>{visual.coverLabel}</span>
                          </div>
                        )}
                      </div>

                      <div className={styles.meta}>
                        <h3 className={styles.title}>{service.title}</h3>

                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={`${styles.button} ${styles.buttonPrimary}`}
                            onClick={() => setActiveServiceId(service.id)}
                          >
                            Bővebben
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {activeService ? (
        <div className={styles.modalBackdrop} onClick={() => setActiveServiceId(null)}>
          <div
            className={styles.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="services-prices-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.modalCloseButton}
              onClick={() => setActiveServiceId(null)}
              aria-label="Árak ablak bezárása"
            >
              Bezárás
            </button>

            <p className="eyebrow">Áraink</p>
            <h2 id="services-prices-title" className={styles.modalTitle}>
              {activeService.title}
            </h2>

            {activeService.pricingText.trim() ? (
              <div className={styles.modalBody}>
                <div
                  className={`${styles.modalBodyRich} rich-content`}
                  dangerouslySetInnerHTML={{ __html: activeService.pricingText }}
                />
              </div>
            ) : (
              <div className={styles.modalBody}>
                <p className={styles.modalBodyEmpty}>Ide kerül majd a szerkeszthető szolgáltatási szöveg.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

