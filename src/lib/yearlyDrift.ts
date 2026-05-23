import { dateAtLocalDecimalHours } from './mappingCurve.js';
import { hoursApart, scaleToSolar } from './scaling.js';
import { computeSunEvents } from './sun.js';
import type { Location } from './types.js';

export const DEFAULT_WORKDAY_START = 9;
export const DEFAULT_WORKDAY_END = 17;
export const SOLAR_MORNING_REF = 6;
export const SOLAR_EVENING_REF = 18;

export interface YearlyDriftParams {
	year: number;
	workdayStart: number;
	workdayEnd: number;
}

export interface YearlyDriftSeries {
	dayOfYear: number[];
	workdayStartSolar: (number | null)[];
	workdayEndSolar: (number | null)[];
	morningRef: number[];
	eveningRef: number[];
}

export function daysInYear(year: number): number {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

/** Gregorian month/day for 1-based day-of-year. */
export function doyToMonthDay(year: number, doy: number): { month: number; day: number } {
	const d = new Date(Date.UTC(year, 0, doy));
	return { month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function solarAtLocalHour(
	loc: Location,
	dayAnchor: Date,
	events: ReturnType<typeof computeSunEvents>,
	decimalHours: number
): number | null {
	if (events.polar !== null) return null;
	const instant = dateAtLocalDecimalHours(dayAnchor, decimalHours, loc.timezone);
	return scaleToSolar(instant, events);
}

/**
 * For each calendar day in `year` at `loc`, map workday start/end linear hours to scaled solar hours.
 * Polar days yield `null` in the series (uPlot gaps).
 */
export function computeYearlyDrift(loc: Location, params: YearlyDriftParams): YearlyDriftSeries {
	const { year, workdayStart, workdayEnd } = params;
	const n = daysInYear(year);
	const dayOfYear: number[] = [];
	const workdayStartSolar: (number | null)[] = [];
	const workdayEndSolar: (number | null)[] = [];
	const morningRef: number[] = [];
	const eveningRef: number[] = [];

	for (let doy = 1; doy <= n; doy++) {
		const { month, day } = doyToMonthDay(year, doy);
		const rough = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
		const noon = dateAtLocalDecimalHours(rough, 12, loc.timezone);
		const events = computeSunEvents(loc, noon);

		dayOfYear.push(doy);
		workdayStartSolar.push(solarAtLocalHour(loc, events.date, events, workdayStart));
		workdayEndSolar.push(solarAtLocalHour(loc, events.date, events, workdayEnd));
		morningRef.push(SOLAR_MORNING_REF);
		eveningRef.push(SOLAR_EVENING_REF);
	}

	return {
		dayOfYear,
		workdayStartSolar,
		workdayEndSolar,
		morningRef,
		eveningRef
	};
}

/** uPlot data: x = day of year; workday lines + constant solar 06 / 18 references. */
export function yearlyDriftUplotData(
	series: YearlyDriftSeries
): [number[], (number | null)[], (number | null)[], number[], number[]] {
	return [
		series.dayOfYear,
		series.workdayStartSolar,
		series.workdayEndSolar,
		series.morningRef,
		series.eveningRef
	];
}

/** Format decimal solar hours as `H:MM` on a 24 h clock. */
export function formatSolarHours(hours: number): string {
	const wrapped = ((hours % 24) + 24) % 24;
	const h = Math.floor(wrapped);
	const m = Math.round((wrapped - h) * 60) % 60;
	return `${h}:${String(m).padStart(2, '0')}`;
}

/** Short calendar label for a day-of-year (e.g. "Dec 21"). */
export function formatDoyLabel(year: number, doy: number): string {
	const { month, day } = doyToMonthDay(year, doy);
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC'
	}).format(new Date(Date.UTC(year, month - 1, day)));
}

/** Max absolute deviation from input linear hour across the year (equator stability test). */
export function maxYearlyDriftFromLinear(
	series: YearlyDriftSeries,
	workdayStart: number,
	workdayEnd: number
): { startMax: number; endMax: number } {
	let startMax = 0;
	let endMax = 0;
	for (let i = 0; i < series.dayOfYear.length; i++) {
		const s = series.workdayStartSolar[i];
		const e = series.workdayEndSolar[i];
		if (s != null && Number.isFinite(s)) {
			startMax = Math.max(startMax, hoursApart(s, workdayStart));
		}
		if (e != null && Number.isFinite(e)) {
			endMax = Math.max(endMax, hoursApart(e, workdayEnd));
		}
	}
	return { startMax, endMax };
}
