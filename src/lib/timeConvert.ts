import { PolarSunError } from './errors.js';
import { dateAtLocalDecimalHours, localDecimalHours } from './mappingCurve.js';
import { scaleToClock, scaleToSolar } from './scaling.js';
import { computeSunEvents } from './sun.js';
import type { Location, SunEvents } from './types.js';

/** `YYYY-MM-DD` for `<input type="date">` in the given IANA timezone. */
export function formatDateInputInZone(instant: Date, timeZone: string): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(instant);
}

/** Local-noon anchor on the calendar day from a date input value. */
export function noonAnchorForDateInput(dateValue: string, timeZone: string): Date {
	const [year, month, day] = dateValue.split('-').map(Number);
	const rough = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
	return dateAtLocalDecimalHours(rough, 12, timeZone);
}

export function sunEventsForDateInput(dateValue: string, loc: Location): SunEvents {
	return computeSunEvents(loc, noonAnchorForDateInput(dateValue, loc.timezone));
}

export interface ConvertedRange {
	from: number;
	to: number | null;
}

/** Map one clock-time hour (today at `loc`) to scaled solar hours. */
export function clockHoursToSolar(
	decimalHours: number,
	loc: Location,
	dayAnchor: Date,
	events: SunEvents
): number {
	if (events.polar !== null) throw new PolarSunError();
	const instant = dateAtLocalDecimalHours(dayAnchor, decimalHours, loc.timezone);
	return scaleToSolar(instant, events);
}

/** Map one solar hour to local clock decimal hours. */
export function solarHoursToClock(solarHours: number, loc: Location, events: SunEvents): number {
	if (events.polar !== null) throw new PolarSunError();
	const instant = scaleToClock(solarHours, events);
	return localDecimalHours(instant, loc.timezone);
}

export function convertClockRangeToSolar(
	from: number,
	to: number | null,
	loc: Location,
	dayAnchor: Date,
	events: SunEvents
): ConvertedRange {
	return {
		from: clockHoursToSolar(from, loc, dayAnchor, events),
		to: to === null ? null : clockHoursToSolar(to, loc, dayAnchor, events)
	};
}

export function convertSolarRangeToClock(
	from: number,
	to: number | null,
	loc: Location,
	events: SunEvents
): ConvertedRange {
	return {
		from: solarHoursToClock(from, loc, events),
		to: to === null ? null : solarHoursToClock(to, loc, events)
	};
}
