import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	applyThemeToDocument,
	cycleThemePreference,
	loadThemePreference,
	persistThemePreference,
	THEME_STORAGE_KEY,
	themeToggleLabel
} from './theme.js';

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

describe('theme store helpers', () => {
	const storage = createLocalStorageMock();

	beforeEach(() => {
		vi.stubGlobal('localStorage', storage);
		storage.clear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('loadThemePreference returns system when storage is empty', () => {
		expect(loadThemePreference()).toBe('system');
	});

	it('loadThemePreference reads light and dark from storage', () => {
		storage.setItem(THEME_STORAGE_KEY, 'light');
		expect(loadThemePreference()).toBe('light');
		storage.setItem(THEME_STORAGE_KEY, 'dark');
		expect(loadThemePreference()).toBe('dark');
	});

	it('loadThemePreference ignores invalid values', () => {
		storage.setItem(THEME_STORAGE_KEY, 'sepia');
		expect(loadThemePreference()).toBe('system');
	});

	it('persistThemePreference writes light/dark and removes key for system', () => {
		persistThemePreference('dark');
		expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
		persistThemePreference('system');
		expect(storage.getItem(THEME_STORAGE_KEY)).toBeNull();
	});

	it('applyThemeToDocument sets or clears data-theme', () => {
		const root = { dataset: {} as DOMStringMap };
		vi.stubGlobal('document', { documentElement: root });

		applyThemeToDocument('light');
		expect(root.dataset.theme).toBe('light');
		applyThemeToDocument('system');
		expect(root.dataset.theme).toBeUndefined();
	});

	it('cycleThemePreference rotates system → light → dark → system', () => {
		expect(cycleThemePreference('system')).toBe('light');
		expect(cycleThemePreference('light')).toBe('dark');
		expect(cycleThemePreference('dark')).toBe('system');
	});

	it('themeToggleLabel describes each mode', () => {
		expect(themeToggleLabel('system')).toMatch(/system/i);
		expect(themeToggleLabel('light')).toMatch(/light/i);
		expect(themeToggleLabel('dark')).toMatch(/dark/i);
	});
});
