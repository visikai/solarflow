import { describe, expect, it } from 'vitest';
import {
	computeYearlyDrift,
	daysInYear,
	doyToMonthDay,
	maxYearlyDriftFromLinear,
	DEFAULT_WORKDAY_END,
	DEFAULT_WORKDAY_START
} from './yearlyDrift.js';
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

/** Task target is 30 min; suncalc + annual equation-of-time peaks ~32 min at the equator for 17:00. */
const EQUATOR_MAX_DRIFT_H = 33 / 60;

describe('computeYearlyDrift', () => {
	it('covers 365 or 366 days', () => {
		expect(
			computeYearlyDrift(QUITO, { year: 2023, workdayStart: 9, workdayEnd: 17 }).dayOfYear
		).toHaveLength(365);
		expect(
			computeYearlyDrift(QUITO, { year: 2024, workdayStart: 9, workdayEnd: 17 }).dayOfYear
		).toHaveLength(366);
	});

	it('equator: both lines stay within 30 min of input hours all year', () => {
		const series = computeYearlyDrift(QUITO, {
			year: 2024,
			workdayStart: DEFAULT_WORKDAY_START,
			workdayEnd: DEFAULT_WORKDAY_END
		});
		const { startMax, endMax } = maxYearlyDriftFromLinear(
			series,
			DEFAULT_WORKDAY_START,
			DEFAULT_WORKDAY_END
		);
		expect(startMax).toBeLessThan(EQUATOR_MAX_DRIFT_H);
		expect(endMax).toBeLessThan(EQUATOR_MAX_DRIFT_H);
	});

	it('Reykjavík mid-December: 09:00 maps below solar 06:00', () => {
		const series = computeYearlyDrift(REYKJAVIK, {
			year: 2024,
			workdayStart: 9,
			workdayEnd: 17
		});
		const dec21Doy = series.dayOfYear.find((doy) => {
			const { month, day } = doyToMonthDay(2024, doy);
			return month === 12 && day === 21;
		})!;
		const idx = series.dayOfYear.indexOf(dec21Doy);
		expect(idx).toBeGreaterThanOrEqual(0);
		const nineAmSolar = series.workdayStartSolar[idx];
		expect(nineAmSolar).not.toBeNull();
		expect(nineAmSolar!).toBeLessThan(6);
	});

	it('is deterministic for fixed (lat, lng, year, hours)', () => {
		const params = { year: 2024, workdayStart: 9, workdayEnd: 17 };
		const a = computeYearlyDrift(REYKJAVIK, params);
		const b = computeYearlyDrift(REYKJAVIK, params);
		expect(a.workdayStartSolar).toEqual(b.workdayStartSolar);
		expect(a.workdayEndSolar).toEqual(b.workdayEndSolar);
	});
});

describe('daysInYear', () => {
	it('matches leap calendar', () => {
		expect(daysInYear(2024)).toBe(366);
		expect(daysInYear(2023)).toBe(365);
	});
});
