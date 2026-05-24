import { cleanup, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GeolocationDeniedError } from '../errors.js';
import LocationPicker from './LocationPicker.svelte';
import { PRESETS } from '../presets.js';
import {
	LOCATION_STORAGE_KEY,
	PRESET_STORAGE_KEY,
	loadPresetIndex,
	location
} from '../stores/location.js';
import type { Location } from '../types.js';

const LONDON_INDEX = PRESETS.findIndex((p) => p.name === 'London');

const geocodeSuggest = vi.fn<(query: string) => Promise<Location[]>>();
const getBrowserLocation = vi.fn<() => Promise<Location>>();

vi.mock('../geocode.js', () => ({
	geocodeSuggest: (query: string) => geocodeSuggest(query)
}));

vi.mock('../geolocation.js', () => ({
	getBrowserLocation: () => getBrowserLocation()
}));

function createLocalStorageMock() {
	const store = new Map<string, string>();

	return {
		get length() {
			return store.size;
		},
		clear() {
			store.clear();
		},
		getItem(key: string) {
			return store.get(key) ?? null;
		},
		setItem(key: string, value: string) {
			store.set(key, value);
		},
		removeItem(key: string) {
			store.delete(key);
		},
		key(index: number) {
			return [...store.keys()][index] ?? null;
		}
	};
}

describe('LocationPicker', () => {
	const storage = createLocalStorageMock();

	beforeEach(() => {
		vi.stubGlobal('localStorage', storage);
		storage.clear();
		location.set(PRESETS[0]);
		geocodeSuggest.mockReset();
		getBrowserLocation.mockReset();
		getBrowserLocation.mockRejectedValue(new GeolocationDeniedError());
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('renders with the default location', () => {
		render(LocationPicker);

		const current = screen.getByText('Selected').closest('p');
		expect(current).toBeTruthy();
		expect(within(current!).getByText(PRESETS[0].name)).toBeTruthy();
		expect(within(current!).getByText(/35\.6762°/)).toBeTruthy();
	});

	it('attempts geolocation on mount when no preset is saved', async () => {
		render(LocationPicker);

		await waitFor(() => {
			expect(getBrowserLocation).toHaveBeenCalled();
		});
	});

	it('skips geolocation on mount when a preset index is saved', async () => {
		storage.setItem(PRESET_STORAGE_KEY, String(LONDON_INDEX));

		render(LocationPicker);

		await vi.advanceTimersByTimeAsync(0);

		expect(getBrowserLocation).not.toHaveBeenCalled();
		expect(loadPresetIndex()).toBe(LONDON_INDEX);
	});

	it('keeps stored location when auto-geolocation fails', async () => {
		const stored: Location = PRESETS[LONDON_INDEX];
		storage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(stored));
		location.set(stored);

		render(LocationPicker);

		await waitFor(() => {
			expect(getBrowserLocation).toHaveBeenCalled();
		});

		const currentEl = screen.getByText('Selected').closest('p');
		expect(within(currentEl!).getByText('London')).toBeTruthy();
	});

	it('selecting a preset updates the store and localStorage', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(LocationPicker);

		await user.selectOptions(
			screen.getByRole('combobox', { name: 'Preset' }),
			String(LONDON_INDEX)
		);

		let current: Location | undefined;
		const unsub = location.subscribe((value) => {
			current = value;
		});
		unsub();

		expect(current).toEqual(PRESETS[LONDON_INDEX]);
		expect(JSON.parse(storage.getItem(LOCATION_STORAGE_KEY)!)).toEqual(PRESETS[LONDON_INDEX]);
		expect(storage.getItem(PRESET_STORAGE_KEY)).toBe(String(LONDON_INDEX));

		const currentEl = screen.getByText('Selected').closest('p');
		expect(within(currentEl!).getByText(PRESETS[LONDON_INDEX].name)).toBeTruthy();
	});

	it('mocked geocode drives the suggestion dropdown', async () => {
		const results: Location[] = [
			{
				name: 'Paris, France',
				latitude: 48.8566,
				longitude: 2.3522,
				timezone: 'Europe/Paris'
			}
		];
		geocodeSuggest.mockResolvedValue(results);

		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(LocationPicker);

		const searchInput = screen.getByRole('combobox', { name: 'Search' });
		await user.type(searchInput, 'Paris');

		await vi.advanceTimersByTimeAsync(400);

		await waitFor(() => {
			expect(geocodeSuggest).toHaveBeenCalledWith('Paris');
		});

		expect(screen.getByRole('listbox')).toBeTruthy();
		expect(screen.getByRole('option', { name: 'Paris, France' })).toBeTruthy();
	});

	it('keyboard nav through suggestions works', async () => {
		const results: Location[] = [
			{
				name: 'Paris, France',
				latitude: 48.8566,
				longitude: 2.3522,
				timezone: 'Europe/Paris'
			},
			{
				name: 'Paris, Texas',
				latitude: 33.6618,
				longitude: -95.5555,
				timezone: 'America/Chicago'
			}
		];
		geocodeSuggest.mockResolvedValue(results);

		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(LocationPicker);

		const searchInput = screen.getByRole('combobox', { name: 'Search' });
		await user.type(searchInput, 'Paris');
		await vi.advanceTimersByTimeAsync(400);

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeTruthy();
		});

		searchInput.focus();
		await user.keyboard('{ArrowDown}');

		const listbox = screen.getByRole('listbox');
		const options = within(listbox).getAllByRole('option');
		expect(options[0].classList.contains('highlighted')).toBe(true);

		await user.keyboard('{ArrowDown}');
		expect(options[1].classList.contains('highlighted')).toBe(true);

		await user.keyboard('{Enter}');

		await waitFor(() => {
			const currentEl = screen.getByText('Selected').closest('p');
			expect(within(currentEl!).getByText('Paris, Texas')).toBeTruthy();
		});

		let current: Location | undefined;
		const unsub = location.subscribe((value) => {
			current = value;
		});
		unsub();
		expect(current).toEqual(results[1]);
	});
});
