import { describe, expect, it } from 'vitest';
import {
	MAPPING_CURVE_SAMPLES,
	dateAtLocalDecimalHours,
	localDecimalHours,
	sampleMappingCurve
} from './mappingCurve.js';
import type { Location } from './types.js';

const NEW_YORK: Location = {
	name: 'New York',
	latitude: 40.7128,
	longitude: -74.006,
	timezone: 'America/New_York'
};

const QUITO: Location = {
	name: 'Quito',
	latitude: -0.1807,
	longitude: -78.4678,
	timezone: 'America/Guayaquil'
};

describe('sampleMappingCurve', () => {
	const equinox = new Date('2024-03-20T12:00:00-05:00');

	it('returns 1440 points with reference diagonal matching x', () => {
		const series = sampleMappingCurve(NEW_YORK, equinox);
		expect(series).not.toBeNull();
		expect(series!.clock).toHaveLength(MAPPING_CURVE_SAMPLES);
		expect(series!.solar).toHaveLength(MAPPING_CURVE_SAMPLES);
		expect(series!.reference).toHaveLength(MAPPING_CURVE_SAMPLES);
		expect(series!.clock[0]).toBe(0);
		expect(series!.clock[1439]).toBeCloseTo(23 + 59 / 60, 5);
		for (let i = 0; i < MAPPING_CURVE_SAMPLES; i++) {
			expect(series!.reference[i]).toBe(series!.clock[i]);
		}
	});

	it('is stable for fixed location and date', () => {
		const a = sampleMappingCurve(QUITO, equinox);
		const b = sampleMappingCurve(QUITO, equinox);
		expect(a!.solar).toEqual(b!.solar);
		expect(a!.guides).toEqual(b!.guides);
	});

	it('equinox equator curve stays near identity at noon', () => {
		const series = sampleMappingCurve(QUITO, equinox)!;
		const noonIdx = 12 * 60;
		expect(series.solar[noonIdx]).toBeCloseTo(12, 0);
		expect(series.solar[noonIdx]).toBeCloseTo(series.clock[noonIdx], 0);
	});
});

describe('dateAtLocalDecimalHours', () => {
	it('round-trips local decimal hours', () => {
		const anchor = new Date('2024-06-21T12:00:00-04:00');
		const tz = NEW_YORK.timezone;
		for (const h of [0, 6.5, 12, 18.25, 23.75]) {
			const instant = dateAtLocalDecimalHours(anchor, h, tz);
			expect(localDecimalHours(instant, tz)).toBeCloseTo(h, 4);
		}
	});
});
