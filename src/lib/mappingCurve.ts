import { scaleToSolar } from './scaling.js';
import { computeSunEvents } from './sun.js';
import { DEFAULT_SCALING } from './types.js';
import type { Location, SunEvents } from './types.js';

export const MAPPING_CURVE_SAMPLES = 1440;

const HOUR_TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24] as const;

function calendarPartsInZone(
	instant: Date,
	timeZone: string
): { year: number; month: number; day: number } {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(instant);

	return {
		year: Number(parts.find((p) => p.type === 'year')!.value),
		month: Number(parts.find((p) => p.type === 'month')!.value),
		day: Number(parts.find((p) => p.type === 'day')!.value)
	};
}

function localHmS(
	instant: Date,
	timeZone: string
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	}).formatToParts(instant);

	return {
		year: Number(parts.find((p) => p.type === 'year')!.value),
		month: Number(parts.find((p) => p.type === 'month')!.value),
		day: Number(parts.find((p) => p.type === 'day')!.value),
		hour: Number(parts.find((p) => p.type === 'hour')!.value),
		minute: Number(parts.find((p) => p.type === 'minute')!.value),
		second: Number(parts.find((p) => p.type === 'second')!.value)
	};
}

/** Local civil time on the calendar day of `dayAnchor` → `Date`. */
export function dateAtLocalDecimalHours(
	dayAnchor: Date,
	decimalHours: number,
	timeZone: string
): Date {
	const { year, month, day } = calendarPartsInZone(dayAnchor, timeZone);
	const wrapped = ((decimalHours % 24) + 24) % 24;
	const hour = Math.floor(wrapped);
	const minute = Math.floor((wrapped - hour) * 60);
	const second = Math.floor((((wrapped - hour) * 60 - minute) * 60) % 60);

	let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
	for (let attempt = 0; attempt < 6; attempt++) {
		const probe = new Date(utcMs);
		const local = localHmS(probe, timeZone);
		if (local.year !== year || local.month !== month || local.day !== day) {
			utcMs += (hour >= 12 ? -1 : 1) * 3_600_000;
			continue;
		}
		const targetSec = hour * 3600 + minute * 60 + second;
		const actualSec = local.hour * 3600 + local.minute * 60 + local.second;
		const deltaSec = actualSec - targetSec;
		if (deltaSec === 0) return probe;
		utcMs -= deltaSec * 1000;
	}
	return new Date(utcMs);
}

/** Decimal local hours for `instant` in `timeZone`. */
export function localDecimalHours(instant: Date, timeZone: string): number {
	const { hour, minute, second } = localHmS(instant, timeZone);
	return hour + minute / 60 + second / 3600;
}

export interface MappingCurveGuides {
	sunriseX: number;
	sunsetX: number;
	solarMorningY: number;
	solarEveningY: number;
}

export interface MappingCurveSeries {
	clock: number[];
	solar: number[];
	reference: number[];
	guides: MappingCurveGuides;
}

/**
 * Sample `y = scaleToSolar(clock)` at one-minute resolution for the local calendar day.
 * Returns `null` in polar day/night.
 */
export function sampleMappingCurve(
	loc: Location,
	date: Date,
	events: SunEvents = computeSunEvents(loc, date)
): MappingCurveSeries | null {
	if (events.polar !== null) return null;

	const clock: number[] = [];
	const solar: number[] = [];
	const reference: number[] = [];

	for (let i = 0; i < MAPPING_CURVE_SAMPLES; i++) {
		const clockH = i / 60;
		const instant = dateAtLocalDecimalHours(events.date, clockH, loc.timezone);
		clock.push(clockH);
		solar.push(scaleToSolar(instant, events));
		reference.push(clockH);
	}

	const tz = loc.timezone;
	return {
		clock,
		solar,
		reference,
		guides: {
			sunriseX: localDecimalHours(events.sunrise, tz),
			sunsetX: localDecimalHours(events.sunset, tz),
			solarMorningY: DEFAULT_SCALING.scaledSunriseHour,
			solarEveningY: DEFAULT_SCALING.scaledSunsetHour
		}
	};
}

/** uPlot-aligned data: shared x, mapping y, equinox reference y. */
export function mappingCurveUplotData(series: MappingCurveSeries): [number[], number[], number[]] {
	return [series.clock, series.solar, series.reference];
}

export { HOUR_TICKS };
