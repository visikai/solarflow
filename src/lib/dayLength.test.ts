import { describe, expect, it } from 'vitest';
import { clockDayNightHours, formatDayNightSummary, formatDurationHours } from './dayLength.js';
import { computeSunEvents } from './sun.js';
import type { Location } from './types.js';

const NYC: Location = {
	name: 'New York',
	latitude: 40.7128,
	longitude: -74.006,
	timezone: 'America/New_York'
};

describe('clockDayNightHours', () => {
	it('sums to 24h for a normal day', () => {
		const events = computeSunEvents(NYC, new Date('2024-03-20T12:00:00-04:00'));
		expect(events.polar).toBeNull();
		const { daylightHours, nightHours } = clockDayNightHours(events);
		expect(daylightHours + nightHours).toBeCloseTo(24, 5);
		expect(daylightHours).toBeGreaterThan(11);
		expect(daylightHours).toBeLessThan(13);
	});

	it('returns full day or night in polar conditions', () => {
		const polarLoc: Location = {
			name: 'Longyearbyen',
			latitude: 78.2232,
			longitude: 15.6267,
			timezone: 'Arctic/Longyearbyen'
		};
		const winter = computeSunEvents(polarLoc, new Date('2024-12-21T12:00:00+01:00'));
		expect(winter.polar).toBe('night');
		expect(clockDayNightHours(winter)).toEqual({ daylightHours: 0, nightHours: 24 });

		const summer = computeSunEvents(polarLoc, new Date('2024-06-21T12:00:00+02:00'));
		expect(summer.polar).toBe('day');
		expect(clockDayNightHours(summer)).toEqual({ daylightHours: 24, nightHours: 0 });
	});
});

describe('formatDayNightSummary', () => {
	it('formats NYC equinox-style lengths', () => {
		const events = computeSunEvents(NYC, new Date('2024-03-20T12:00:00-04:00'));
		const { daylightHours, nightHours } = clockDayNightHours(events);
		expect(formatDayNightSummary(daylightHours, nightHours)).toMatch(/daylight · \d+h.*night/);
	});

	it('formats sub-hour durations in minutes', () => {
		expect(formatDurationHours(0.5)).toBe('30m');
		expect(formatDayNightSummary(0.25, 0.75)).toBe('15m daylight · 45m night');
	});
});
