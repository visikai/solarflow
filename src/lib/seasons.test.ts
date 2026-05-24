import { describe, expect, it } from 'vitest';
import {
	seasonEventsForYear,
	seasonLabel,
	seasonTimelineCopy,
	sunDeclinationRad
} from './seasons.js';

const NYC_TZ = 'America/New_York';
const NYC_LAT = 40.7128;

const SYDNEY_TZ = 'Australia/Sydney';
const SYDNEY_LAT = -33.8688;

describe('seasonEventsForYear', () => {
	it('places NYC 2024 March equinox on local Mar 19 (DOY 79)', () => {
		const events = seasonEventsForYear(2024, NYC_TZ, NYC_LAT);
		const march = events.find((e) => e.kind === 'march_equinox');
		expect(march).toBeDefined();
		expect(march!.dayOfYear).toBe(79);
		expect(march!.label).toBe('spring equinox');
	});

	it('places NYC 2024 June solstice near DOY 172', () => {
		const events = seasonEventsForYear(2024, NYC_TZ, NYC_LAT);
		const june = events.find((e) => e.kind === 'june_solstice');
		expect(june).toBeDefined();
		expect(june!.dayOfYear).toBeGreaterThanOrEqual(171);
		expect(june!.dayOfYear).toBeLessThanOrEqual(173);
		expect(june!.label).toBe('summer solstice');
	});

	it('labels June as winter solstice in the southern hemisphere', () => {
		const events = seasonEventsForYear(2024, SYDNEY_TZ, SYDNEY_LAT);
		const june = events.find((e) => e.kind === 'june_solstice');
		expect(june!.label).toBe('winter solstice');
	});

	it('returns four events sorted by day-of-year', () => {
		const events = seasonEventsForYear(2024, NYC_TZ, NYC_LAT);
		expect(events).toHaveLength(4);
		for (let i = 1; i < events.length; i++) {
			expect(events[i].dayOfYear).toBeGreaterThanOrEqual(events[i - 1].dayOfYear);
		}
	});
});

describe('seasonLabel', () => {
	it('uses neutral names near the equator', () => {
		expect(seasonLabel('june_solstice', 0)).toBe('June solstice');
		expect(seasonLabel('march_equinox', 4)).toBe('March equinox');
	});
});

describe('seasonTimelineCopy', () => {
	it('shows today line on equinox day', () => {
		const now = new Date('2024-03-19T14:30:00-04:00');
		const copy = seasonTimelineCopy(now, NYC_TZ, NYC_LAT);
		expect(copy.todayLine).toBe('Today is the spring equinox.');
		expect(copy.nextLine).toMatch(/days until the summer solstice/);
	});

	it('counts down the day before equinox', () => {
		const now = new Date('2024-03-18T12:00:00-04:00');
		const copy = seasonTimelineCopy(now, NYC_TZ, NYC_LAT);
		expect(copy.todayLine).toBeNull();
		expect(copy.nextLine).toBe('Tomorrow is the spring equinox.');
	});

	it('counts multiple days before equinox', () => {
		const now = new Date('2024-03-01T12:00:00-05:00');
		const copy = seasonTimelineCopy(now, NYC_TZ, NYC_LAT);
		expect(copy.todayLine).toBeNull();
		expect(copy.nextLine).toBe('18 days until the spring equinox.');
	});

	it('rolls to March equinox after December', () => {
		const now = new Date('2024-12-28T12:00:00-05:00');
		const copy = seasonTimelineCopy(now, NYC_TZ, NYC_LAT);
		expect(copy.nextLine).toMatch(/spring equinox/);
		expect(copy.nextLine).not.toMatch(/winter solstice/);
	});
});

describe('sunDeclinationRad', () => {
	it('crosses zero near March equinox 2024', () => {
		const before = sunDeclinationRad(new Date('2024-03-19T12:00:00Z'));
		const after = sunDeclinationRad(new Date('2024-03-21T12:00:00Z'));
		expect(before).toBeLessThan(0);
		expect(after).toBeGreaterThan(0);
	});
});
