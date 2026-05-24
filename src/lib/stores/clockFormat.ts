import { writable, type Writable } from 'svelte/store';

export const CLOCK_FORMAT_STORAGE_KEY = 'solarflow.clockFormat.v1';

export type ClockFormat = '24' | '12';

function isClockFormat(value: unknown): value is ClockFormat {
	return value === '24' || value === '12';
}

export function loadClockFormat(): ClockFormat {
	if (typeof localStorage === 'undefined') return '24';

	try {
		const raw = localStorage.getItem(CLOCK_FORMAT_STORAGE_KEY);
		if (isClockFormat(raw)) return raw;
	} catch {
		// ignore storage errors
	}

	return '24';
}

export function persistClockFormat(format: ClockFormat): void {
	if (typeof localStorage === 'undefined') return;

	try {
		localStorage.setItem(CLOCK_FORMAT_STORAGE_KEY, format);
	} catch {
		// ignore storage errors
	}
}

export function clockFormatLabel(format: ClockFormat): string {
	return format === '24' ? '24h' : '12h';
}

export function clockFormatToggleLabel(active: ClockFormat): string {
	return active === '24'
		? 'Clock format: 24-hour. Switch to 12-hour with am/pm.'
		: 'Clock format: 12-hour with am/pm. Switch to 24-hour.';
}

function createClockFormatStore(): Writable<ClockFormat> {
	const initial = loadClockFormat();
	const store = writable<ClockFormat>(initial);

	store.subscribe((value) => {
		persistClockFormat(value);
	});

	return store;
}

/** App-wide 12h/24h display preference; persisted to localStorage (default 24h). */
export const clockFormat = createClockFormatStore();
