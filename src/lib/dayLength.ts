import { localDecimalHours } from './mappingCurve.js';
import { formatTimeInput } from './timeInput.js';
import type { SunEvents } from './types.js';

const MS_PER_HOUR = 3_600_000;
const HOURS_PER_DAY = 24;

export interface ClockDayNightHours {
	daylightHours: number;
	nightHours: number;
}

/** Clock-time daylight and night length for a calendar day (matches the timeline strip). */
export function clockDayNightHours(sun: SunEvents): ClockDayNightHours {
	if (sun.polar === 'day') {
		return { daylightHours: HOURS_PER_DAY, nightHours: 0 };
	}
	if (sun.polar === 'night') {
		return { daylightHours: 0, nightHours: HOURS_PER_DAY };
	}
	const daylightHours = (sun.sunset.getTime() - sun.sunrise.getTime()) / MS_PER_HOUR;
	return { daylightHours, nightHours: HOURS_PER_DAY - daylightHours };
}

/** Human-readable duration from decimal hours (e.g. `12h 9m`). */
export function formatDurationHours(hours: number): string {
	const totalMinutes = Math.round(hours * 60);
	const h = Math.floor(totalMinutes / 60);
	const m = totalMinutes % 60;
	if (h === 0) return `${m}m`;
	if (m === 0) return `${h}h`;
	return `${h}h ${m}m`;
}

export function formatDayNightSummary(daylightHours: number, nightHours: number): string {
	return `${formatDurationHours(daylightHours)} daylight · ${formatDurationHours(nightHours)} night`;
}

export interface YearlyTooltipDaySection {
	polarNote: string | null;
	sunTimesLine: string | null;
	dayNightLine: string;
}

/** Clock sunrise/sunset and day length lines for the yearly drift hover tooltip. */
export function formatYearlyTooltipDaySection(
	sun: SunEvents,
	timeZone: string
): YearlyTooltipDaySection {
	const { daylightHours, nightHours } = clockDayNightHours(sun);
	const dayNightLine = formatDayNightSummary(daylightHours, nightHours);

	if (sun.polar === 'day') {
		return {
			polarNote: 'Polar day — sun stays above the horizon',
			sunTimesLine: null,
			dayNightLine
		};
	}
	if (sun.polar === 'night') {
		return {
			polarNote: 'Polar night — sun stays below the horizon',
			sunTimesLine: null,
			dayNightLine
		};
	}

	const sunrise = formatTimeInput(localDecimalHours(sun.sunrise, timeZone));
	const sunset = formatTimeInput(localDecimalHours(sun.sunset, timeZone));
	return {
		polarNote: null,
		sunTimesLine: `Sunrise ${sunrise} · Sunset ${sunset}`,
		dayNightLine
	};
}
