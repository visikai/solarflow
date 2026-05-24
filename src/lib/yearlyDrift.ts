import { dateAtLocalDecimalHours } from './mappingCurve.js';
import { hoursApart, scaleToSolar } from './scaling.js';
import { computeSunEvents } from './sun.js';
import type { Location } from './types.js';

export const DEFAULT_WORKDAY_START = 9;
export const DEFAULT_WORKDAY_END = 17;
export const SOLAR_MORNING_REF = 6;
export const SOLAR_EVENING_REF = 18;

/** Fixed y-axis for the yearly drift chart (full solar clock). */
export const YEARLY_DRIFT_Y_RANGE = { min: 0, max: 24 } as const;

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

/** Day-of-year (1-based) for the first day of each month in `year`. */
export function monthStartDaysOfYear(year: number): number[] {
	const starts: number[] = [];
	const n = daysInYear(year);
	for (let doy = 1; doy <= n; doy++) {
		if (doyToMonthDay(year, doy).day === 1) starts.push(doy);
	}
	return starts;
}

function tzOffsetMinutes(timeZone: string, instant: Date): number {
	const utc = new Date(instant.toLocaleString('en-US', { timeZone: 'UTC' }));
	const local = new Date(instant.toLocaleString('en-US', { timeZone }));
	return (local.getTime() - utc.getTime()) / 60_000;
}

/** True when `timezone` uses different UTC offsets at some point in `year`. */
export function locationObservesDst(timeZone: string, year: number): boolean {
	const offsets = new Set<number>();
	for (let month = 0; month < 12; month++) {
		offsets.add(tzOffsetMinutes(timeZone, new Date(Date.UTC(year, month, 15, 12, 0, 0))));
	}
	return offsets.size > 1;
}

/** Local calendar day-of-year for `instant` in `timeZone` when its year matches `year`. */
export function currentDayOfYear(
	timeZone: string,
	year: number,
	instant: Date = new Date()
): number | null {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(instant);
	const y = Number(parts.find((p) => p.type === 'year')!.value);
	if (y !== year) return null;
	const month = Number(parts.find((p) => p.type === 'month')!.value);
	const day = Number(parts.find((p) => p.type === 'day')!.value);
	let doy = 0;
	for (let m = 1; m < month; m++) {
		doy += new Date(Date.UTC(year, m, 0)).getUTCDate();
	}
	return doy + day;
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

/** uPlot data: x, solar 06/18 refs (daytime band), then workday start/end (work band). */
export function yearlyDriftUplotData(
	series: YearlyDriftSeries
): [number[], number[], number[], (number | null)[], (number | null)[]] {
	return [
		series.dayOfYear,
		series.morningRef,
		series.eveningRef,
		series.workdayStartSolar,
		series.workdayEndSolar
	];
}

/** Y-axis bounds for the yearly drift chart (always full 0–24 h solar clock). */
export function yearlyDriftYRange(): { min: number; max: number } {
	return { ...YEARLY_DRIFT_Y_RANGE };
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

export interface WorkdaySolarOverlap {
	/** Fraction of the fixed 06:00–18:00 window covered by the work interval. */
	daytimeFraction: number;
	/** Fraction of the fixed 18:00–06:00 night window covered by the work interval. */
	nighttimeFraction: number;
	/** False when the entire work interval lies within 06:00–18:00. */
	hasNightOverlap: boolean;
}

function overlapOnLine(a0: number, a1: number, b0: number, b1: number): number {
	return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

/** Work interval as one or two segments on a 24 h clock (wrap when start > end). */
function workSolarSegments(startSolar: number, endSolar: number): [number, number][] {
	const s = ((startSolar % 24) + 24) % 24;
	const e = ((endSolar % 24) + 24) % 24;
	if (s <= e) return [[s, e]];
	return [
		[s, 24],
		[0, e]
	];
}

/**
 * Share of fixed solar day (06:00–18:00) and night (18:00–06:00) occupied by the work block
 * between converted solar start/end. Work spans midnight when start > end on the clock.
 */
export function workdaySolarOverlapFractions(
	startSolar: number,
	endSolar: number,
	dayStart = SOLAR_MORNING_REF,
	dayEnd = SOLAR_EVENING_REF
): WorkdaySolarOverlap {
	const dayWindow = dayEnd - dayStart;
	const nightWindow = 24 - dayWindow;
	const segments = workSolarSegments(startSolar, endSolar);

	let daytimeHours = 0;
	let nighttimeHours = 0;
	for (const [ws, we] of segments) {
		daytimeHours += overlapOnLine(ws, we, dayStart, dayEnd);
		nighttimeHours += overlapOnLine(ws, we, 0, dayStart);
		nighttimeHours += overlapOnLine(ws, we, dayEnd, 24);
	}

	const fullyInsideDay = segments.every(([ws, we]) => ws >= dayStart && we <= dayEnd);

	return {
		daytimeFraction: daytimeHours / dayWindow,
		nighttimeFraction: nighttimeHours / nightWindow,
		hasNightOverlap: !fullyInsideDay && nighttimeHours > 0
	};
}

/** Tooltip line for work hours vs fixed solar daytime / nighttime windows. */
export function formatWorkhoursOverlapLabel(overlap: WorkdaySolarOverlap): string {
	const dayPct = Math.round(overlap.daytimeFraction * 100);
	let label = `Workhours = ${dayPct}% of daytime`;
	if (overlap.hasNightOverlap) {
		const nightPct = Math.round(overlap.nighttimeFraction * 100);
		label += ` and ${nightPct}% of nighttime`;
	}
	return label;
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
