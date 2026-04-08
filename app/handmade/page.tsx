import type { Metadata } from "next";

import { HandmadeMap } from "@/app/_components/handmade-map";
import { getHandmadeEvents } from "@/lib/handmade-events";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Handmade",
};

function formatEventDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatEventDateRange(startDate: string, endDate: string) {
  const formattedStartDate = formatEventDate(startDate);
  const formattedEndDate = formatEventDate(endDate);

  if (startDate === endDate) {
    return formattedStartDate;
  }

  return `${formattedStartDate} - ${formattedEndDate}`;
}

export default async function HandmadePage() {
  const events = await getHandmadeEvents();

  return (
    <section className="section">
      <div className="shell page-intro">
        <div className={`editorial-panel editorial-panel--single ${styles.brandIntro}`}>
          <div className={styles.logoWrap}>
            <video
              className={styles.logoVideo}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              aria-label="HendiMedi animált logó"
            >
              <source src="/hendimedi-logo.mp4" type="video/mp4" />
              <source src="/hendimedi-logo.mov" type="video/quicktime" />
            </video>
          </div>

          <div className={styles.brandCopy}>
            <p className={styles.lead}>
              Kézzel készült, egyedi noteszek és határidőnaplók megtalálhatóak
              székhelyünkön, illetve az alábbi vásárokon és alkalmakon.
            </p>
          </div>
        </div>

        <div className={`editorial-panel ${styles.mapPanel}`}>
          <div className={styles.mapFrameWrap}>
            <HandmadeMap
              events={events.map((event) => ({
                id: event.id,
                name: event.name,
                coordinates: event.coordinates,
              }))}
            />
          </div>

          <aside className={styles.locationCard}>
            <p className="eyebrow">Helyszín</p>
            <h2 className={styles.locationTitle}>Székhelyünk</h2>
            <p className={styles.locationAddress}>
              530232 Csíkszereda, Nagyrét u. 22 sz.
            </p>

            <div className={styles.eventsBlock}>
              <h3 className={styles.eventsTitle}>Rendezvények:</h3>

              {events.length === 0 ? (
                <p className={styles.emptyEvents}>
                  Hamarosan itt jelennek meg a következő handmade rendezvények.
                </p>
              ) : (
                <ul className={styles.eventsList}>
                  {events.map((event) => (
                    <li key={event.id} className={styles.eventItem}>
                      {event.website ? (
                        <a
                          href={event.website}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.eventLink}
                        >
                          {event.name}
                        </a>
                      ) : (
                        <span className={styles.eventName}>{event.name}</span>
                      )}
                      <p className={styles.eventDate}>
                        {formatEventDateRange(event.startDate, event.endDate)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
