import { GeocodeNetworkError } from './errors.js';
import { lazyTzLookup } from './timezone.js';
import type { Location } from './types.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const CACHE_PREFIX = 'solarflow.geocode.v1.';
const MAX_CACHE_ENTRIES = 200;
const MIN_REQUEST_INTERVAL_MS = 1000;

interface CacheEntry {
	results: Location[];
	cachedAt: number;
}

interface NominatimResult {
	display_name?: string;
	name?: string;
	lat: string;
	lon: string;
}

let lastRequestAt = 0;
let requestQueue: Promise<void> = Promise.resolve();

function normalizeGeocodeQuery(query: string): string {
	return query.trim().replace(/\s+/g, ' ').toLowerCase();
}

function cacheStorageKey(normalized: string): string {
	return `${CACHE_PREFIX}${normalized}`;
}

function readCache(normalized: string): Location[] | undefined {
	if (typeof localStorage === 'undefined') return undefined;

	try {
		const raw = localStorage.getItem(cacheStorageKey(normalized));
		if (!raw) return undefined;
		const entry = JSON.parse(raw) as CacheEntry;
		return entry.results;
	} catch {
		return undefined;
	}
}

function writeCache(normalized: string, results: Location[]): void {
	if (typeof localStorage === 'undefined') return;

	const entry: CacheEntry = { results, cachedAt: Date.now() };
	localStorage.setItem(cacheStorageKey(normalized), JSON.stringify(entry));
	evictOldestCacheEntries();
}

function evictOldestCacheEntries(): void {
	if (typeof localStorage === 'undefined') return;

	const entries: { key: string; cachedAt: number }[] = [];

	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (!key?.startsWith(CACHE_PREFIX)) continue;

		try {
			const raw = localStorage.getItem(key);
			if (!raw) continue;
			const { cachedAt } = JSON.parse(raw) as CacheEntry;
			entries.push({ key, cachedAt });
		} catch {
			localStorage.removeItem(key);
		}
	}

	if (entries.length <= MAX_CACHE_ENTRIES) return;

	entries.sort((a, b) => a.cachedAt - b.cachedAt);
	const excess = entries.length - MAX_CACHE_ENTRIES;
	for (let i = 0; i < excess; i++) {
		localStorage.removeItem(entries[i].key);
	}
}

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rateLimited<T>(fn: () => Promise<T>): Promise<T> {
	const run = requestQueue.then(async () => {
		const now = Date.now();
		const delay = Math.max(0, MIN_REQUEST_INTERVAL_MS - (now - lastRequestAt));
		if (delay > 0) await wait(delay);
		lastRequestAt = Date.now();
		return fn();
	});

	requestQueue = run.then(
		() => undefined,
		() => undefined
	);
	return run;
}

async function fetchNominatim(query: string): Promise<NominatimResult[]> {
	const url = `${NOMINATIM_URL}?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`;

	return rateLimited(async () => {
		let response: Response;
		try {
			response = await fetch(url);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Geocoding request failed';
			throw new GeocodeNetworkError(message);
		}

		if (!response.ok) {
			throw new GeocodeNetworkError(`Geocoding request failed (${response.status})`);
		}

		try {
			return (await response.json()) as NominatimResult[];
		} catch {
			throw new GeocodeNetworkError('Invalid geocoding response');
		}
	});
}

async function mapNominatimResult(result: NominatimResult): Promise<Location> {
	const latitude = Number.parseFloat(result.lat);
	const longitude = Number.parseFloat(result.lon);
	const name = result.display_name ?? result.name ?? `${latitude}, ${longitude}`;
	const timezone = (await lazyTzLookup(latitude, longitude)) ?? 'UTC';

	return { name, latitude, longitude, timezone };
}

/** Nominatim search with cache and rate limiting; up to 5 `Location` results. */
export async function geocodeSuggest(query: string): Promise<Location[]> {
	const normalized = normalizeGeocodeQuery(query);
	if (!normalized) return [];

	const cached = readCache(normalized);
	if (cached !== undefined) return cached;

	const trimmed = query.trim().replace(/\s+/g, ' ');
	const raw = await fetchNominatim(trimmed);
	const results = await Promise.all(raw.map(mapNominatimResult));

	writeCache(normalized, results);
	return results;
}

/** First geocode suggestion, or `null` when none. */
export async function geocode(query: string): Promise<Location | null> {
	return (await geocodeSuggest(query))[0] ?? null;
}
