import type { Metadata } from "next";

import { HandmadeMap } from "@/app/_components/handmade-map";
import { getHandmadeEvents } from "@/lib/handmade-events";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Rendezvények",
};

export const dynamic = "force-dynamic";

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

export default async function EventsPage() {
  const events = await getHandmadeEvents();

  return (
    <section className="section">
      <div className="shell page-intro">
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
            <div className={styles.eventsBlock}>
              <h3 className={styles.eventsTitle}>Közelgő rendezvények</h3>

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
