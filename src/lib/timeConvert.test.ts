import { describe, expect, it } from 'vitest';
import { PolarSunError } from './errors.js';
import { formatTimeInput } from './timeInput.js';
import {
	clockHoursToSolar,
	convertClockRangeToSolar,
	convertSolarRangeToClock,
	formatDateInputInZone,
	noonAnchorForDateInput,
	solarHoursToClock,
	sunEventsForDateInput
} from './timeConvert.js';
import { computeSunEvents } from './sun.js';
import type { Location } from './types.js';

const NYC: Location = {
	name: 'New York',
	latitude: 40.7128,
	longitude: -74.006,
	timezone: 'America/New_York'
};

const CAPE_TOWN: Location = {
	name: 'Cape Town',
	latitude: -33.9249,
	longitude: 18.4241,
	timezone: 'Africa/Johannesburg'
};

const equinoxNoon = new Date('2024-03-20T12:00:00-04:00');

describe('timeConvert', () => {
	it('maps clock 09:00 to solar on equinox NYC', () => {
		const events = computeSunEvents(NYC, equinoxNoon);
		const solar = clockHoursToSolar(9, NYC, events.date, events);
		expect(solar).toBeGreaterThan(6);
		expect(solar).toBeLessThan(10);
	});

	it('round-trips a clock hour through solar', () => {
		const events = computeSunEvents(NYC, equinoxNoon);
		const solar = clockHoursToSolar(14.5, NYC, events.date, events);
		const back = solarHoursToClock(solar, NYC, events);
		expect(back).toBeCloseTo(14.5, 2);
	});

	it('converts a clock range to solar endpoints', () => {
		const events = computeSunEvents(NYC, equinoxNoon);
		const range = convertClockRangeToSolar(9, 17, NYC, events.date, events);
		expect(range.from).toBeLessThan(range.to!);
	});

	it('converts a solar range to clock endpoints', () => {
		const events = computeSunEvents(NYC, equinoxNoon);
		const range = convertSolarRangeToClock(6, 18, NYC, events);
		expect(range.from).toBeLessThan(range.to!);
	});

	it('formats and parses date input in location timezone', () => {
		const anchor = noonAnchorForDateInput('2024-03-20', NYC.timezone);
		expect(formatDateInputInZone(anchor, NYC.timezone)).toBe('2024-03-20');
		const events = sunEventsForDateInput('2024-03-20', NYC);
		expect(events.polar).toBeNull();
	});

	it('formats Cape Town morning clock→solar without hour/minute mismatch', () => {
		const events = sunEventsForDateInput('2026-05-24', CAPE_TOWN);
		const solar0830 = clockHoursToSolar(8 + 30 / 60, CAPE_TOWN, events.date, events);
		const formatted = formatTimeInput(solar0830);
		expect(formatted).not.toBe('06:00');
		expect(formatted).toMatch(/^0[67]:/);
		const solar0825 = clockHoursToSolar(8 + 25 / 60, CAPE_TOWN, events.date, events);
		const solar0835 = clockHoursToSolar(8 + 35 / 60, CAPE_TOWN, events.date, events);
		expect(solar0825).toBeLessThan(solar0830);
		expect(solar0830).toBeLessThan(solar0835);
	});

	it('throws in polar conditions', () => {
		const polarLoc: Location = {
			name: 'Longyearbyen',
			latitude: 78.2232,
			longitude: 15.6267,
			timezone: 'Arctic/Longyearbyen'
		};
		const winter = new Date('2024-12-21T12:00:00+01:00');
		const events = computeSunEvents(polarLoc, winter);
		expect(events.polar).toBe('night');
		expect(() => clockHoursToSolar(9, polarLoc, events.date, events)).toThrow(PolarSunError);
	});
});
