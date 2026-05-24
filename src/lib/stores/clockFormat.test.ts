import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	clockFormatLabel,
	clockFormatToggleLabel,
	CLOCK_FORMAT_STORAGE_KEY,
	loadClockFormat,
	persistClockFormat
} from './clockFormat.js';

function createLocalStorageMock() {
	const map = new Map<string, string>();
	return {
		getItem: (key: string) => map.get(key) ?? null,
		setItem: (key: string, value: string) => {
			map.set(key, value);
		},
		removeItem: (key: string) => {
			map.delete(key);
		},
		clear: () => map.clear()
	};
}

describe('clockFormat store helpers', () => {
	const storage = createLocalStorageMock();

	beforeEach(() => {
		vi.stubGlobal('localStorage', storage);
		storage.clear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('loadClockFormat returns 24 when storage is empty', () => {
		expect(loadClockFormat()).toBe('24');
	});

	it('loadClockFormat reads 24 and 12 from storage', () => {
		storage.setItem(CLOCK_FORMAT_STORAGE_KEY, '12');
		expect(loadClockFormat()).toBe('12');
		storage.setItem(CLOCK_FORMAT_STORAGE_KEY, '24');
		expect(loadClockFormat()).toBe('24');
	});

	it('loadClockFormat ignores invalid values', () => {
		storage.setItem(CLOCK_FORMAT_STORAGE_KEY, 'military');
		expect(loadClockFormat()).toBe('24');
	});

	it('persistClockFormat writes format to storage', () => {
		persistClockFormat('12');
		expect(storage.getItem(CLOCK_FORMAT_STORAGE_KEY)).toBe('12');
		persistClockFormat('24');
		expect(storage.getItem(CLOCK_FORMAT_STORAGE_KEY)).toBe('24');
	});

	it('clockFormatLabel returns short labels', () => {
		expect(clockFormatLabel('24')).toBe('24h');
		expect(clockFormatLabel('12')).toBe('12h');
	});

	it('clockFormatToggleLabel describes each mode', () => {
		expect(clockFormatToggleLabel('24')).toMatch(/24-hour/i);
		expect(clockFormatToggleLabel('12')).toMatch(/12-hour/i);
	});
});
