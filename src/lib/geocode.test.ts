import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Location } from './types.js';

vi.mock('./timezone.js', () => ({
	lazyTzLookup: vi.fn(async () => 'Atlantic/Reykjavik')
}));

const CACHE_PREFIX = 'solarflow.geocode.v1.';

function listCacheKeys(store: Storage): string[] {
	const keys: string[] = [];
	for (let i = 0; i < store.length; i++) {
		const key = store.key(i);
		if (key?.startsWith(CACHE_PREFIX)) keys.push(key);
	}
	return keys;
}

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

const reykjavikNominatim = [
	{
		display_name: 'Reykjavik, Iceland',
		lat: '64.1466',
		lon: '-21.9426'
	}
];

function nominatimResponse(body: unknown, ok = true) {
	return {
		ok,
		status: ok ? 200 : 500,
		json: async () => body
	} as Response;
}

describe('geocode', () => {
	const fetchMock = vi.fn();
	const storage = createLocalStorageMock();

	beforeEach(() => {
		vi.stubGlobal('fetch', fetchMock);
		vi.stubGlobal('localStorage', storage);
		storage.clear();
		fetchMock.mockReset();
		vi.resetModules();
		vi.useRealTimers();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	async function loadGeocode() {
		return import('./geocode.js');
	}

	it('returns null on empty results', async () => {
		fetchMock.mockResolvedValue(nominatimResponse([]));
		const { geocode } = await loadGeocode();

		await expect(geocode('nowhere')).resolves.toBeNull();
	});

	it('uses cache on second call without a second fetch', async () => {
		fetchMock.mockResolvedValue(nominatimResponse(reykjavikNominatim));
		const { geocodeSuggest } = await loadGeocode();

		await geocodeSuggest('Reykjavik');
		await geocodeSuggest('Reykjavik');

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('normalizes queries to the same cache entry', async () => {
		fetchMock.mockResolvedValue(nominatimResponse(reykjavikNominatim));
		const { geocodeSuggest } = await loadGeocode();

		await geocodeSuggest('  Reykjavik  ');
		await geocodeSuggest('reykjavik');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(storage.getItem(`${CACHE_PREFIX}reykjavik`)).not.toBeNull();
	});

	it('evicts oldest cache entries beyond 200', async () => {
		for (let i = 0; i < 200; i++) {
			storage.setItem(
				`${CACHE_PREFIX}place-${i}`,
				JSON.stringify({
					results: [
						{
							name: `Place ${i}`,
							latitude: i,
							longitude: i,
							timezone: 'UTC'
						}
					],
					cachedAt: i
				})
			);
		}

		fetchMock.mockResolvedValue(nominatimResponse(reykjavikNominatim));
		const { geocodeSuggest } = await loadGeocode();
		await geocodeSuggest('place-200');

		const cacheKeys = listCacheKeys(storage);
		expect(cacheKeys).toHaveLength(200);
		expect(storage.getItem(`${CACHE_PREFIX}place-0`)).toBeNull();
		expect(storage.getItem(`${CACHE_PREFIX}place-200`)).not.toBeNull();
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('rate limiter waits at least one second between requests', async () => {
		vi.useFakeTimers();
		fetchMock.mockResolvedValue(nominatimResponse(reykjavikNominatim));
		const { geocodeSuggest } = await loadGeocode();

		const first = geocodeSuggest('Oslo');
		await vi.advanceTimersByTimeAsync(0);
		await first;
		expect(fetchMock).toHaveBeenCalledTimes(1);

		const second = geocodeSuggest('Bergen');
		await vi.advanceTimersByTimeAsync(999);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(1);
		await second;
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('throws GeocodeNetworkError on network failure', async () => {
		fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
		const { geocodeSuggest } = await loadGeocode();

		await expect(geocodeSuggest('Reykjavik')).rejects.toMatchObject({
			name: 'GeocodeNetworkError'
		});
	});

	it('maps nominatim results to Location with timezone', async () => {
		fetchMock.mockResolvedValue(nominatimResponse(reykjavikNominatim));
		const { geocode } = await loadGeocode();

		const location = await geocode('Reykjavik');
		expect(location).toEqual({
			name: 'Reykjavik, Iceland',
			latitude: 64.1466,
			longitude: -21.9426,
			timezone: 'Atlantic/Reykjavik'
		} satisfies Location);
	});
});
