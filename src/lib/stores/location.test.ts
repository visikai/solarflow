import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRESETS } from '../presets.js';
import {
	loadPresetIndex,
	LOCATION_STORAGE_KEY,
	PRESET_STORAGE_KEY,
	persistPresetIndex
} from './location.js';

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

describe('location preset persistence', () => {
	const storage = createLocalStorageMock();

	beforeEach(() => {
		vi.stubGlobal('localStorage', storage);
		storage.clear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('loadPresetIndex returns null when unset', () => {
		expect(loadPresetIndex()).toBeNull();
	});

	it('persistPresetIndex round-trips a valid index', () => {
		persistPresetIndex(7);
		expect(storage.getItem(PRESET_STORAGE_KEY)).toBe('7');
		expect(loadPresetIndex()).toBe(7);
	});

	it('persistPresetIndex removes the key when cleared', () => {
		persistPresetIndex(3);
		persistPresetIndex(null);
		expect(storage.getItem(PRESET_STORAGE_KEY)).toBeNull();
	});

	it('loadPresetIndex ignores out-of-range indices', () => {
		storage.setItem(PRESET_STORAGE_KEY, String(PRESETS.length + 5));
		expect(loadPresetIndex()).toBeNull();
	});

	it('loadFromBootstrap prefers preset index before location JSON', async () => {
		vi.resetModules();

		const londonIndex = PRESETS.findIndex((p) => p.name === 'London');
		vi.stubGlobal('window', {
			__SOLARFLOW_BOOT__: {
				presetIndex: londonIndex,
				locationJson: JSON.stringify(PRESETS[0])
			}
		});

		const { location } = await import('./location.js');
		let current = PRESETS[0];
		const unsub = location.subscribe((v) => {
			current = v;
		});
		unsub();

		expect(current).toEqual(PRESETS[londonIndex]);
		vi.unstubAllGlobals();
	});

	it('saved preset index takes precedence over stored custom location on init', async () => {
		vi.resetModules();

		const london = PRESETS.find((p) => p.name === 'London')!;
		const tokyo = PRESETS[0];
		const londonIndex = PRESETS.findIndex((p) => p.name === 'London');
		storage.setItem(PRESET_STORAGE_KEY, String(londonIndex));
		storage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(tokyo));
		vi.stubGlobal('window', {
			__SOLARFLOW_BOOT__: { presetIndex: londonIndex, locationJson: JSON.stringify(tokyo) }
		});

		const { location } = await import('./location.js');
		let current = tokyo;
		const unsub = location.subscribe((v) => {
			current = v;
		});
		unsub();

		expect(current).toEqual(london);
	});
});
