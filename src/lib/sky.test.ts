import { describe, expect, it } from 'vitest';
import { peakAltitudeDegrees, sampleSunArc } from './sky.js';
import type { Location } from './types.js';

const QUITO: Location = {
	name: 'Quito',
	latitude: -0.1807,
	longitude: -78.4678,
	timezone: 'America/Guayaquil'
};

const REYKJAVIK: Location = {
	name: 'Reykjavik',
	latitude: 64.1466,
	longitude: -21.9426,
	timezone: 'Atlantic/Reykjavik'
};

function local(iso: string): Date {
	return new Date(iso);
}

describe('sampleSunArc', () => {
	it('returns the requested sample count', () => {
		const samples = sampleSunArc(QUITO, local('2024-03-20T12:00:00-05:00'), 48);
		expect(samples).toHaveLength(48);
	});

	it('keeps altitudes within physical bounds', () => {
		const samples = sampleSunArc(QUITO, local('2024-03-20T12:00:00-05:00'), 48);
		for (const s of samples) {
			expect(s.altitude).toBeGreaterThanOrEqual(-Math.PI / 2 - 1e-9);
			expect(s.altitude).toBeLessThanOrEqual(Math.PI / 2 + 1e-9);
		}
	});

	it('equator equinox: peak altitude is near 90°', () => {
		const samples = sampleSunArc(QUITO, local('2024-03-20T12:00:00-05:00'), 48);
		const peak = peakAltitudeDegrees(samples);
		expect(peak).toBeGreaterThan(85);
		expect(peak).toBeLessThanOrEqual(90.5);
	});

	it('Reykjavík midwinter: peak altitude only a few degrees above the horizon', () => {
		const samples = sampleSunArc(REYKJAVIK, local('2024-12-21T12:00:00Z'), 48);
		const peak = peakAltitudeDegrees(samples);
		expect(peak).toBeGreaterThan(0);
		expect(peak).toBeLessThan(12);
	});
});
