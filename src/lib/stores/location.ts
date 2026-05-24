import { writable, type Writable } from 'svelte/store';
import { PRESETS } from '../presets.js';
import type { Location } from '../types.js';

export const LOCATION_STORAGE_KEY = 'solarflow.location.v1';
export const PRESET_STORAGE_KEY = 'solarflow.presetIndex.v1';

export function loadPresetIndex(): number | null {
	if (typeof localStorage === 'undefined') return null;

	try {
		const raw = localStorage.getItem(PRESET_STORAGE_KEY);
		if (raw === null) return null;
		const index = Number.parseInt(raw, 10);
		if (Number.isInteger(index) && index >= 0 && index < PRESETS.length) return index;
	} catch {
		// ignore corrupt storage
	}

	return null;
}

export function persistPresetIndex(index: number | null): void {
	if (typeof localStorage === 'undefined') return;

	try {
		if (index === null) {
			localStorage.removeItem(PRESET_STORAGE_KEY);
		} else {
			localStorage.setItem(PRESET_STORAGE_KEY, String(index));
		}
	} catch {
		// ignore storage errors
	}
}

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

function loadFromBootstrap(): Location | null {
	if (typeof window === 'undefined') return null;

	const boot = window.__SOLARFLOW_BOOT__;
	if (!boot) return null;

	if (boot.presetIndex !== undefined) {
		const { presetIndex } = boot;
		if (Number.isInteger(presetIndex) && presetIndex >= 0 && presetIndex < PRESETS.length) {
			return PRESETS[presetIndex];
		}
	}

	if (boot.locationJson) {
		try {
			const parsed: unknown = JSON.parse(boot.locationJson);
			if (isValidLocation(parsed)) return parsed;
		} catch {
			// ignore corrupt storage
		}
	}

	return null;
}

function loadFromStorage(): Location {
	const fromBootstrap = loadFromBootstrap();
	if (fromBootstrap !== null) return fromBootstrap;

	const presetIndex = loadPresetIndex();
	if (presetIndex !== null) return PRESETS[presetIndex];

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
