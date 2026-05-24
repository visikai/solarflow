import { writable, type Writable } from 'svelte/store';

export const THEME_STORAGE_KEY = 'solarflow.theme.v1';

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = ThemeMode | 'system';

function isThemeMode(value: unknown): value is ThemeMode {
	return value === 'light' || value === 'dark';
}

export function loadThemePreference(): ThemePreference {
	if (typeof localStorage === 'undefined') return 'system';

	try {
		const raw = localStorage.getItem(THEME_STORAGE_KEY);
		if (isThemeMode(raw)) return raw;
	} catch {
		// ignore storage errors
	}

	return 'system';
}

export function persistThemePreference(preference: ThemePreference): void {
	if (typeof localStorage === 'undefined') return;

	try {
		if (preference === 'system') {
			localStorage.removeItem(THEME_STORAGE_KEY);
		} else {
			localStorage.setItem(THEME_STORAGE_KEY, preference);
		}
	} catch {
		// ignore storage errors
	}
}

export function applyThemeToDocument(preference: ThemePreference): void {
	if (typeof document === 'undefined') return;

	const root = document.documentElement;
	if (preference === 'system') {
		delete root.dataset.theme;
	} else {
		root.dataset.theme = preference;
	}
}

export function cycleThemePreference(current: ThemePreference): ThemePreference {
	if (current === 'system') return 'light';
	if (current === 'light') return 'dark';
	return 'system';
}

export function themeToggleLabel(preference: ThemePreference): string {
	switch (preference) {
		case 'system':
			return 'Theme: system (follows device). Activate for light theme.';
		case 'light':
			return 'Theme: light. Activate for dark theme.';
		case 'dark':
			return 'Theme: dark. Activate for system theme.';
	}
}

function createThemeStore(): Writable<ThemePreference> {
	const initial = loadThemePreference();
	applyThemeToDocument(initial);

	const store = writable<ThemePreference>(initial);

	store.subscribe((value) => {
		persistThemePreference(value);
		applyThemeToDocument(value);
	});

	return store;
}

/** App-wide theme preference; persisted to localStorage (omit key for system). */
export const theme = createThemeStore();
