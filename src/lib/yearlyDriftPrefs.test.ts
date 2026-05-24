import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	loadShowSeasonMarkers,
	persistShowSeasonMarkers,
	SHOW_SEASON_MARKERS_KEY
} from './yearlyDriftPrefs.js';

describe('yearlyDriftPrefs', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('defaults to showing season markers', () => {
		const storage = new Map<string, string>();
		vi.stubGlobal('localStorage', {
			getItem: (k: string) => storage.get(k) ?? null,
			setItem: (k: string, v: string) => storage.set(k, v),
			removeItem: (k: string) => storage.delete(k)
		});
		expect(loadShowSeasonMarkers()).toBe(true);
	});

	it('persists and restores false', () => {
		const storage = new Map<string, string>();
		vi.stubGlobal('localStorage', {
			getItem: (k: string) => storage.get(k) ?? null,
			setItem: (k: string, v: string) => storage.set(k, v),
			removeItem: (k: string) => storage.delete(k)
		});
		persistShowSeasonMarkers(false);
		expect(storage.get(SHOW_SEASON_MARKERS_KEY)).toBe('0');
		expect(loadShowSeasonMarkers()).toBe(false);
	});
});
