import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef } from 'react';
import { buildPins } from '../../lib/mapPins';
import { RATING_COLORS, RATING_TEXT } from '../../lib/ratingColors';
import type { EntryView } from '../../types';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface EntryMapProps {
  entries: EntryView[];
  /** Called with a place id when its pin is clicked or activated from the keyboard. */
  onSelectPlace?(placeId: string): void;
  selectedPlaceId?: string | null;
  className?: string;
  /** Accessible name for the map region. */
  label?: string;
}

/** Pin markup is built only from numbers and our own colour constants, never user text. */
function pinIcon(rating: 1 | 2 | 3 | 4 | 5, selected: boolean): L.DivIcon {
  const size = selected ? 44 : 36;
  return L.divIcon({
    className: 'ft-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html:
      `<span style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;` +
      `background:${RATING_COLORS[rating]};color:${RATING_TEXT[rating]};font:700 ${selected ? 18 : 15}px system-ui,sans-serif;` +
      `border:${selected ? 4 : 3}px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5)">${rating}</span>`,
  });
}

/** Leaflet + OpenStreetMap tiles. One pin per place, coloured (and numbered) by rating. */
export function EntryMap({ entries, onSelectPlace, selectedPlaceId = null, className = '', label = 'Map of your entries' }: EntryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onSelectRef = useRef(onSelectPlace);
  const pins = useMemo(() => buildPins(entries), [entries]);

  useEffect(() => {
    onSelectRef.current = onSelectPlace;
  });

  // Create / destroy the map.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const map = L.map(el, { worldCopyJump: true }).setView([30, 10], 2);
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw pins and fit the view. Declared after the effect above so the map exists when this runs.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    for (const pin of pins) {
      const selected = pin.placeId === selectedPlaceId;
      const title = `${pin.name}, rated ${pin.rating} out of 5${pin.visits > 1 ? `, ${pin.visits} visits` : ''}`;
      L.marker([pin.lat, pin.lng], { icon: pinIcon(pin.rating, selected), title, alt: title, keyboard: true, zIndexOffset: selected ? 1000 : 0 })
        .on('click', () => onSelectRef.current?.(pin.placeId))
        .addTo(layer);
    }
    return () => {
      layer.remove();
    };
  }, [pins, selectedPlaceId]);

  // Re-fit only when the set of places changes, not when selection changes.
  const fitKey = pins.map((p) => p.placeId).sort().join('|');
  useEffect(() => {
    const map = mapRef.current;
    if (!map || pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0]!.lat, pins[0]!.lng], 14);
    } else {
      map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 14 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  return <div ref={containerRef} role="region" aria-label={label} className={`z-0 w-full rounded-2xl border border-line ${className}`} />;
}
