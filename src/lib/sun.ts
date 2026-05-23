import SunCalc from 'suncalc';
import type { Location, SunEvents } from './types.js';

function isInvalidDate(d: Date): boolean {
	return Number.isNaN(d.getTime());
}

/** Calendar Y-M-D of `instant` in `timeZone` (IANA). */
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

	const year = Number(parts.find((p) => p.type === 'year')!.value);
	const month = Number(parts.find((p) => p.type === 'month')!.value);
	const day = Number(parts.find((p) => p.type === 'day')!.value);
	return { year, month, day };
}

/** Local-noon anchor for suncalc on the given calendar day in `timeZone`. */
function noonOnCalendarDay(year: number, month: number, day: number, timeZone: string): Date {
	const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
	const parts = calendarPartsInZone(utcNoon, timeZone);
	if (parts.year === year && parts.month === month && parts.day === day) {
		return utcNoon;
	}
	// DST edge: step by hours until the formatted calendar day matches.
	for (let h = 0; h < 24; h++) {
		const candidate = new Date(Date.UTC(year, month - 1, day, h, 0, 0, 0));
		const p = calendarPartsInZone(candidate, timeZone);
		if (p.year === year && p.month === month && p.day === day) {
			return new Date(Date.UTC(year, month - 1, day, h + 12, 0, 0, 0));
		}
	}
	return utcNoon;
}

function addCalendarDays(year: number, month: number, day: number, delta: number): Date {
	const d = new Date(Date.UTC(year, month - 1, day + delta, 12, 0, 0, 0));
	return d;
}

function detectPolar(
	times: ReturnType<typeof SunCalc.getTimes>,
	latitude: number,
	longitude: number
): 'day' | 'night' {
	const sample = isInvalidDate(times.solarNoon) ? new Date() : times.solarNoon;
	const { altitude } = SunCalc.getPosition(sample, latitude, longitude);
	return altitude > 0 ? 'day' : 'night';
}

/**
 * Sun times for the local calendar day of `date` at `loc` (per `loc.timezone`).
 */
export function computeSunEvents(loc: Location, date: Date): SunEvents {
	const { year, month, day } = calendarPartsInZone(date, loc.timezone);
	const dayAnchor = noonOnCalendarDay(year, month, day, loc.timezone);
	const prevParts = calendarPartsInZone(addCalendarDays(year, month, day, -1), loc.timezone);
	const prevAnchor = noonOnCalendarDay(
		prevParts.year,
		prevParts.month,
		prevParts.day,
		loc.timezone
	);
	const nextParts = calendarPartsInZone(addCalendarDays(year, month, day, 1), loc.timezone);
	const nextAnchor = noonOnCalendarDay(
		nextParts.year,
		nextParts.month,
		nextParts.day,
		loc.timezone
	);

	const times = SunCalc.getTimes(dayAnchor, loc.latitude, loc.longitude);
	const prevTimes = SunCalc.getTimes(prevAnchor, loc.latitude, loc.longitude);
	const nextTimes = SunCalc.getTimes(nextAnchor, loc.latitude, loc.longitude);

	const sunrise = times.sunrise;
	const sunset = times.sunset;
	const solarNoon = times.solarNoon;
	const nextSunrise = nextTimes.sunrise;
	const previousSunset = prevTimes.sunset;

	if (
		isInvalidDate(sunrise) ||
		isInvalidDate(sunset) ||
		isInvalidDate(solarNoon) ||
		isInvalidDate(nextSunrise) ||
		isInvalidDate(previousSunset)
	) {
		return {
			date: dayAnchor,
			sunrise,
			solarNoon,
			sunset,
			nextSunrise,
			previousSunset,
			polar: detectPolar(times, loc.latitude, loc.longitude)
		};
	}

	return {
		date: dayAnchor,
		sunrise,
		solarNoon,
		sunset,
		nextSunrise,
		previousSunset,
		polar: null
	};
}
