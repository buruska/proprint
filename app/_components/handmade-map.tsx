"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

import styles from "./handmade-map.module.css";

const MAP_CENTER: [number, number] = [46.3665513, 25.7997897];
const HEADQUARTERS_LABEL = "Pro-Print Könyvkiadó";

type HandmadeMapEvent = {
  id: string;
  name: string;
  coordinates: string;
};

function parseCoordinates(value: string) {
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(value);

  if (!match) {
    return null;
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return [latitude, longitude] as [number, number];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createMarkerIcon(label: string, variant: "headquarters" | "event") {
  const modifierClass =
    variant === "headquarters" ? styles.markerHeadquarters : styles.markerEvent;

  return {
    className: styles.markerRoot,
    html: `
      <div class="${styles.marker} ${modifierClass}">
        <span class="${styles.markerLabel}">${escapeHtml(label)}</span>
        <span class="${styles.markerPin}" aria-hidden="true"></span>
      </div>
    `,
    iconSize: [220, 64] as [number, number],
    iconAnchor: [110, 64] as [number, number],
  };
}

export function HandmadeMap({ events }: { events: HandmadeMapEvent[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      const L = await import("leaflet");

      if (cancelled || !containerRef.current) {
        return;
      }

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
      }).setView(MAP_CENTER, 16);

      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> közreműködők',
        maxZoom: 19,
      }).addTo(map);

      const headquartersIcon = L.divIcon(createMarkerIcon(HEADQUARTERS_LABEL, "headquarters"));
      const markerPoints: Array<[number, number]> = [MAP_CENTER];

      L.marker(MAP_CENTER, { icon: headquartersIcon }).addTo(map);

      for (const event of events) {
        const coordinates = parseCoordinates(event.coordinates);

        if (!coordinates) {
          continue;
        }

        const eventIcon = L.divIcon(createMarkerIcon(event.name, "event"));
        L.marker(coordinates, { icon: eventIcon }).addTo(map);
        markerPoints.push(coordinates);
      }

      if (markerPoints.length > 1) {
        map.fitBounds(markerPoints, {
          padding: [36, 36],
        });
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [events]);

  return <div ref={containerRef} className={styles.map} aria-label="Pro-Print Könyvkiadó és handmade rendezvények térkép" />;
}
