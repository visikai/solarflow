import { describe, expect, it } from 'vitest';
import { browserTimezone, lazyTzLookup } from './timezone.js';

describe('browserTimezone', () => {
	it('returns a non-empty IANA-style string', () => {
		const tz = browserTimezone();
		expect(tz.length).toBeGreaterThan(0);
		expect(() => Intl.DateTimeFormat(undefined, { timeZone: tz })).not.toThrow();
	});
});

describe('lazyTzLookup', () => {
	it('returns sensible timezones for known coordinates', async () => {
		await expect(lazyTzLookup(40.7128, -74.006)).resolves.toBe('America/New_York');
		await expect(lazyTzLookup(51.5074, -0.1278)).resolves.toBe('Europe/London');
		await expect(lazyTzLookup(35.6762, 139.6503)).resolves.toBe('Asia/Tokyo');
		await expect(lazyTzLookup(64.1466, -21.9426)).resolves.toBe('Atlantic/Reykjavik');
	});

	it('returns null for out-of-range coordinates', async () => {
		await expect(lazyTzLookup(91, 0)).resolves.toBeNull();
		await expect(lazyTzLookup(0, 181)).resolves.toBeNull();
		await expect(lazyTzLookup(Number.NaN, 0)).resolves.toBeNull();
	});
});
