type TzLookupFn = (latitude: number, longitude: number) => string;

let tzLookupFn: TzLookupFn | null = null;

/** IANA timezone from the host environment (no lat/lng lookup). */
export function browserTimezone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Resolve IANA timezone for coordinates via lazy-loaded `@photostructure/tz-lookup`.
 * Returns `null` when coordinates are out of range or lookup fails.
 */
export async function lazyTzLookup(lat: number, lng: number): Promise<string | null> {
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

	try {
		if (!tzLookupFn) {
			const mod = await import('@photostructure/tz-lookup');
			tzLookupFn = mod.default;
		}
		return tzLookupFn(lat, lng);
	} catch {
		return null;
	}
}
