/**
 * Parity vs ../solarflow-py (astral) uses a 2-minute tolerance (0.0333 h).
 * suncalc and astral share NOAA-style algorithms but can diverge by ~90 s near solstices.
 */
import { describe, expect, it } from 'vitest';
import parityFixtures from '../tests/fixtures/parity.json';
import { PolarSunError } from './errors.js';
import { hoursApart, scaleToLinear, scaleToSolar } from './scaling.js';
import { computeSunEvents } from './sun.js';
import type { Location } from './types.js';

const PARITY_TOLERANCE_HOURS = 2 / 60; // 2 minutes

const REYKJAVIK: Location = {
	name: 'Reykjavik',
	latitude: 64.1466,
	longitude: -21.9426,
	timezone: 'Atlantic/Reykjavik'
};

const QUITO: Location = {
	name: 'Quito',
	latitude: -0.1807,
	longitude: -78.4678,
	timezone: 'America/Guayaquil'
};

const NEW_YORK: Location = {
	name: 'New York',
	latitude: 40.7128,
	longitude: -74.006,
	timezone: 'America/New_York'
};

const TOLERANCE_MIN = 1 / 60; // 1 minute in decimal hours
function local(iso: string): Date {
	return new Date(iso);
}

describe('scaleToSolar / scaleToLinear', () => {
	it('equinox at the equator is near identity at key points (within 1 min)', () => {
		const events = computeSunEvents(QUITO, local('2024-03-20T12:00:00-05:00'));

		for (const [instant, expectedSolar] of [
			[events.sunrise, 6],
			[events.solarNoon, 12],
			[events.sunset, 18]
		] as const) {
			expect(hoursApart(scaleToSolar(instant, events), expectedSolar)).toBeLessThan(TOLERANCE_MIN);
		}

		expect(hoursApart(scaleToSolar(events.solarNoon, events), 12)).toBeLessThan(TOLERANCE_MIN);
	});

	it('Reykjavík mid-winter matches README worked example', () => {
		const events = computeSunEvents(REYKJAVIK, local('2024-12-21T12:00:00Z'));

		expect(hoursApart(scaleToSolar(events.sunrise, events), 6)).toBeLessThan(TOLERANCE_MIN);
		expect(hoursApart(scaleToSolar(events.solarNoon, events), 12)).toBeLessThan(TOLERANCE_MIN);
		expect(hoursApart(scaleToSolar(events.sunset, events), 18)).toBeLessThan(TOLERANCE_MIN);

		for (const sample of [
			local('2024-12-21T09:00:00Z'),
			local('2024-12-21T13:25:00Z'),
			local('2024-12-21T17:00:00Z')
		]) {
			const solar = scaleToSolar(sample, events);
			const back = scaleToLinear(solar, events);
			expect(Math.abs(back.getTime() - sample.getTime())).toBeLessThan(1000);
		}

		const nineAm = scaleToSolar(local('2024-12-21T09:00:00Z'), events);
		const fivePm = scaleToSolar(local('2024-12-21T17:00:00Z'), events);
		expect(nineAm).toBeLessThan(6);
		expect(fivePm).toBeGreaterThan(18);
	});

	it('Reykjavík mid-summer compresses night and stretches day', () => {
		const events = computeSunEvents(REYKJAVIK, local('2024-06-21T12:00:00Z'));
		const dayLength = (events.sunset.getTime() - events.sunrise.getTime()) / 3_600_000;
		const nightLength = (events.nextSunrise.getTime() - events.sunset.getTime()) / 3_600_000;

		expect(dayLength).toBeGreaterThan(18);
		expect(nightLength).toBeLessThan(6);

		expect(hoursApart(scaleToSolar(events.solarNoon, events), 12)).toBeLessThan(TOLERANCE_MIN);

		const afterSunset = new Date(events.sunset.getTime() + 30 * 60 * 1000);
		const solarEvening = scaleToSolar(afterSunset, events);
		const unwrapped = solarEvening < 18 ? solarEvening + 24 : solarEvening;
		expect(unwrapped).toBeGreaterThan(18);
		expect(unwrapped).toBeLessThan(24);
	});

	it('maps exact boundaries: sunrise, solar noon, sunset', () => {
		const events = computeSunEvents(REYKJAVIK, local('2024-12-21T12:00:00Z'));

		expect(hoursApart(scaleToSolar(events.sunrise, events), 6)).toBeLessThan(TOLERANCE_MIN);
		expect(hoursApart(scaleToSolar(events.solarNoon, events), 12)).toBeLessThan(TOLERANCE_MIN);
		expect(hoursApart(scaleToSolar(events.sunset, events), 18)).toBeLessThan(TOLERANCE_MIN);
	});

	it('round-trips within 1 s across a linear-time sweep', () => {
		const events = computeSunEvents(NEW_YORK, local('2024-06-21T12:00:00-04:00'));
		const start = events.sunrise.getTime();
		const end = events.nextSunrise.getTime();
		const step = 15 * 60 * 1000;

		for (let t = start; t < end; t += step) {
			const linear = new Date(t);
			const solar = scaleToSolar(linear, events);
			const back = scaleToLinear(solar, events);
			expect(Math.abs(back.getTime() - linear.getTime())).toBeLessThan(1000);
		}
	});

	it('DST fall-back day has no gap in the solar mapping', () => {
		const events = computeSunEvents(NEW_YORK, local('2024-11-03T12:00:00-05:00'));
		const samples = [
			'2024-11-03T01:00:00-05:00',
			'2024-11-03T04:00:00-05:00',
			'2024-11-03T08:00:00-05:00',
			'2024-11-03T14:00:00-05:00'
		].map(local);

		const solarHours = samples.map((d) => scaleToSolar(d, events));
		for (let i = 1; i < solarHours.length; i++) {
			const delta = solarHours[i] - solarHours[i - 1];
			expect(delta).toBeGreaterThan(-0.01);
			expect(delta).toBeLessThan(8);
		}

		for (const sample of samples) {
			const solar = scaleToSolar(sample, events);
			const back = scaleToLinear(solar, events);
			expect(Math.abs(back.getTime() - sample.getTime())).toBeLessThan(1000);
		}
	});

	it('throws PolarSunError on polar day and polar night', () => {
		const tromso: Location = {
			name: 'Tromso',
			latitude: 69.6492,
			longitude: 18.9553,
			timezone: 'Europe/Oslo'
		};
		const polarDay = computeSunEvents(tromso, local('2024-06-21T12:00:00+02:00'));
		const polarNight = computeSunEvents(tromso, local('2024-01-15T12:00:00+01:00'));

		expect(polarDay.polar).toBe('day');
		expect(polarNight.polar).toBe('night');

		const now = local('2024-06-21T12:00:00+02:00');
		expect(() => scaleToSolar(now, polarDay)).toThrow(PolarSunError);
		expect(() => scaleToLinear(12, polarDay)).toThrow(PolarSunError);
		expect(() => scaleToSolar(now, polarNight)).toThrow(PolarSunError);
		expect(() => scaleToLinear(12, polarNight)).toThrow(PolarSunError);
	});
});

describe('parity with solarflow-py (astral)', () => {
	it('matches pre-generated fixtures within 2 minutes', () => {
		for (const row of parityFixtures) {
			const loc = row.location as Location;
			const instant = new Date(row.instant);
			const events = computeSunEvents(loc, instant);
			if (events.polar !== null) {
				continue;
			}
			const solar = scaleToSolar(instant, events);
			expect(hoursApart(solar, row.expectedSolarHours)).toBeLessThan(PARITY_TOLERANCE_HOURS);
		}
	});
});
