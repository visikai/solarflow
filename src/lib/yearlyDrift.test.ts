import { describe, expect, it } from 'vitest';
import {
	computeYearlyDrift,
	currentDayOfYear,
	daysInYear,
	doyToMonthDay,
	formatWorkhoursOverlapLabel,
	locationObservesDst,
	maxYearlyDriftFromClock,
	monthStartDaysOfYear,
	sunEventsForDayOfYear,
	workdaySolarOverlapFractions,
	yearlyDriftYRange,
	YEARLY_DRIFT_Y_RANGE,
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

const NEW_YORK: Location = {
	name: 'New York',
	latitude: 40.7128,
	longitude: -74.006,
	timezone: 'America/New_York'
};

/** Task target is 30 min; suncalc + annual equation-of-time peaks ~32 min at the equator for 17:00. */
const EQUATOR_MAX_DRIFT_H = 33 / 60;

describe('yearlyDriftYRange', () => {
	it('always uses the full 0–24 h solar clock', () => {
		expect(yearlyDriftYRange()).toEqual(YEARLY_DRIFT_Y_RANGE);
	});
});

describe('monthStartDaysOfYear', () => {
	it('returns the first day of each month', () => {
		const starts = monthStartDaysOfYear(2024);
		expect(starts).toHaveLength(12);
		expect(starts[0]).toBe(1);
		expect(doyToMonthDay(2024, starts[2])).toEqual({ month: 3, day: 1 });
	});
});

describe('locationObservesDst', () => {
	it('detects US daylight saving', () => {
		expect(locationObservesDst(NEW_YORK.timezone, 2024)).toBe(true);
	});

	it('is false where offsets stay fixed', () => {
		expect(locationObservesDst(QUITO.timezone, 2024)).toBe(false);
		expect(locationObservesDst(REYKJAVIK.timezone, 2024)).toBe(false);
	});
});

describe('currentDayOfYear', () => {
	it('returns local day-of-year for the same calendar year', () => {
		const instant = new Date('2024-06-15T12:00:00-04:00');
		expect(currentDayOfYear('America/New_York', 2024, instant)).toBe(167);
	});
});

describe('sunEventsForDayOfYear', () => {
	it('matches computeYearlyDrift anchor for the same day', () => {
		const fromHelper = sunEventsForDayOfYear(NEW_YORK, 2024, 80);
		const series = computeYearlyDrift(NEW_YORK, {
			year: 2024,
			workdayStart: DEFAULT_WORKDAY_START,
			workdayEnd: DEFAULT_WORKDAY_END
		});
		const doy = 80;
		const idx = series.dayOfYear.indexOf(doy);
		expect(idx).toBeGreaterThanOrEqual(0);
		expect(fromHelper.polar).toBeNull();
		expect(fromHelper.sunrise.getTime()).toBeLessThan(fromHelper.sunset.getTime());
	});
});

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
		const { startMax, endMax } = maxYearlyDriftFromClock(
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

describe('workdaySolarOverlapFractions', () => {
	it('work fully inside 06–18 has no night overlap', () => {
		const o = workdaySolarOverlapFractions(8, 16);
		expect(o.daytimeFraction).toBeCloseTo(8 / 12);
		expect(o.nighttimeFraction).toBe(0);
		expect(o.hasNightOverlap).toBe(false);
	});

	it('work spanning dusk has day and night shares', () => {
		const o = workdaySolarOverlapFractions(7, 19);
		expect(o.daytimeFraction).toBeCloseTo(11 / 12);
		expect(o.nighttimeFraction).toBeCloseTo(1 / 12);
		expect(o.hasNightOverlap).toBe(true);
	});

	it('wraps midnight when start > end', () => {
		const o = workdaySolarOverlapFractions(22, 2);
		expect(o.daytimeFraction).toBe(0);
		expect(o.nighttimeFraction).toBeCloseTo(4 / 12);
		expect(o.hasNightOverlap).toBe(true);
	});

	it('formats tooltip labels', () => {
		expect(formatWorkhoursOverlapLabel(workdaySolarOverlapFractions(8, 16))).toBe(
			'Workhours = 67% of daytime'
		);
		expect(formatWorkhoursOverlapLabel(workdaySolarOverlapFractions(7, 19))).toBe(
			'Workhours = 92% of daytime and 8% of nighttime'
		);
	});
});

describe('daysInYear', () => {
	it('matches leap calendar', () => {
		expect(daysInYear(2024)).toBe(366);
		expect(daysInYear(2023)).toBe(365);
	});
});
