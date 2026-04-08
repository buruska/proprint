"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

import styles from "./admin-handmade-coordinate-picker.module.css";

const DEFAULT_CENTER: [number, number] = [46.3665513, 25.7997897];
const DEFAULT_ZOOM = 13;

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

function formatCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export function AdminHandmadeCoordinatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

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

      const pinIcon = L.divIcon({
        className: styles.pinRoot,
        html: `<span class="${styles.pin}"></span>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });

      const map = L.map(containerRef.current, {
        scrollWheelZoom: true,
        zoomControl: true,
      }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

      mapRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> közreműködők &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20,
      }).addTo(map);

      const initialCoordinates = parseCoordinates(valueRef.current);

      if (initialCoordinates) {
        markerRef.current = L.marker(initialCoordinates, { icon: pinIcon }).addTo(map);
        map.setView(initialCoordinates, 15);
      }

      map.on("click", (event) => {
        const latitude = event.latlng.lat;
        const longitude = event.latlng.lng;
        const coordinates: [number, number] = [latitude, longitude];

        if (!markerRef.current) {
          markerRef.current = L.marker(coordinates, { icon: pinIcon }).addTo(map);
        } else {
          markerRef.current.setLatLng(coordinates);
        }

        onChangeRef.current(formatCoordinates(latitude, longitude));
      });
    })();

    return () => {
      cancelled = true;
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const map = mapRef.current;

      if (!map) {
        return;
      }

      const coordinates = parseCoordinates(value);

      if (!coordinates) {
        markerRef.current?.remove();
        markerRef.current = null;
        return;
      }

      const L = await import("leaflet");
      const pinIcon = L.divIcon({
        className: styles.pinRoot,
        html: `<span class="${styles.pin}"></span>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });

      if (!markerRef.current) {
        markerRef.current = L.marker(coordinates, { icon: pinIcon }).addTo(map);
      } else {
        markerRef.current.setLatLng(coordinates);
      }
    })();
  }, [value]);

  return (
    <div className={styles.root}>
      <div ref={containerRef} className={styles.map} aria-label="Koordináta kiválasztó térkép" />
      <p className={styles.helper}>Kattints arra a pontra, ahol a rendezvény lesz, és a koordináta automatikusan kitöltődik.</p>
    </div>
  );
}
