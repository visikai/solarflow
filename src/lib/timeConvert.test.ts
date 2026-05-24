import { describe, expect, it } from 'vitest';
import { PolarSunError } from './errors.js';
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
