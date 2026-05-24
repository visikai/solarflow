import { derived, type Readable } from 'svelte/store';
import { scaleToSolar } from '../scaling.js';
import { computeSunEvents } from '../sun.js';
import type { Location, SunEvents } from '../types.js';
import { location } from './location.js';
import { linearNow } from './time.js';

/** Cache key: local calendar day + coordinates (sun times depend on place, not name). */
export function sunEventsCacheKey(now: Date, loc: Location): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: loc.timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(now);
	const y = parts.find((p) => p.type === 'year')!.value;
	const m = parts.find((p) => p.type === 'month')!.value;
	const d = parts.find((p) => p.type === 'day')!.value;
	return `${y}-${m}-${d}|${loc.latitude},${loc.longitude}|${loc.timezone}`;
}

let cachedKey = '';
let cachedEvents: SunEvents | null = null;

/**
 * Sun-rise/noon/set for the selected location's local calendar day.
 * Recomputed only when the day or location changes — not on every animation frame.
 */
export const sunEvents: Readable<SunEvents> = derived([linearNow, location], ([$now, $loc]) => {
	const key = sunEventsCacheKey($now, $loc);
	if (key !== cachedKey || cachedEvents === null) {
		cachedKey = key;
		cachedEvents = computeSunEvents($loc, $now);
	}
	return cachedEvents;
});

/** Scaled solar hours for `$linearNow` at `$location`, or `null` in polar conditions. */
export const solarNow: Readable<number | null> = derived(
	[linearNow, sunEvents],
	([$now, $events]) => {
		if ($events.polar !== null) return null;
		return scaleToSolar($now, $events);
	}
);
