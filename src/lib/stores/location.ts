import { writable, type Writable } from 'svelte/store';
import { PRESETS } from '../presets.js';
import type { Location } from '../types.js';

export const LOCATION_STORAGE_KEY = 'solarflow.location.v1';

function isValidLocation(value: unknown): value is Location {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		typeof v.name === 'string' &&
		typeof v.latitude === 'number' &&
		typeof v.longitude === 'number' &&
		typeof v.timezone === 'string' &&
		Number.isFinite(v.latitude) &&
		Number.isFinite(v.longitude)
	);
}

function loadFromStorage(): Location {
	if (typeof localStorage === 'undefined') return PRESETS[0];

	try {
		const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
		if (!raw) return PRESETS[0];
		const parsed: unknown = JSON.parse(raw);
		if (isValidLocation(parsed)) return parsed;
	} catch {
		// ignore corrupt storage
	}

	return PRESETS[0];
}

function createLocationStore(): Writable<Location> {
	const store = writable<Location>(loadFromStorage());

	store.subscribe((value) => {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(value));
	});

	return store;
}

/** App-wide selected location; persisted to localStorage. */
export const location = createLocationStore();
