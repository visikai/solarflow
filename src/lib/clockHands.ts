import { formatDecimalHours, formatInstant } from './timeDisplay.js';
import type { ClockFormat } from './stores/clockFormat.js';

export interface ClockHandAngles {
	hour: number;
	minute: number;
	second: number;
}

export interface LocalTimeParts {
	hours24: number;
	hours12: number;
	minutes: number;
	seconds: number;
	ms: number;
}

/** Radians for polar coords: 0° = 12 o'clock, clockwise positive (matches tick marks). */
export function radiansFrom12oclock(degreesFrom12: number): number {
	return (degreesFrom12 / 360) * Math.PI * 2 - Math.PI / 2;
}

/** Tip of a clock hand in SVG user space (y grows downward). */
export function handTip(
	cx: number,
	cy: number,
	length: number,
	degreesFrom12: number
): { x: number; y: number } {
	const angle = radiansFrom12oclock(degreesFrom12);
	return {
		x: cx + length * Math.cos(angle),
		y: cy + length * Math.sin(angle)
	};
}

export function decomposeDecimalHours(decimalHours: number): LocalTimeParts {
	const wrapped = ((decimalHours % 24) + 24) % 24;
	const hours24 = Math.floor(wrapped);
	const hours12 = hours24 % 12;
	const dayFrac = wrapped - hours24;
	const totalMinutes = dayFrac * 60;
	const minutes = Math.floor(totalMinutes);
	const totalSeconds = (totalMinutes - minutes) * 60;
	const seconds = Math.floor(totalSeconds);
	const ms = (totalSeconds - seconds) * 1000;
	return { hours24, hours12, minutes, seconds, ms };
}

export function localTimeParts(instant: Date, timeZone: string): LocalTimeParts {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone,
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric',
		fractionalSecondDigits: 3,
		hour12: false
	}).formatToParts(instant);
	const hours24 = Number(parts.find((p) => p.type === 'hour')!.value);
	const minutes = Number(parts.find((p) => p.type === 'minute')!.value);
	const seconds = Number(parts.find((p) => p.type === 'second')!.value);
	const ms = Number(parts.find((p) => p.type === 'fractionalSecond')?.value ?? 0);
	const hours12 = hours24 % 12;
	return { hours24, hours12, minutes, seconds, ms };
}

function handAnglesFromParts(parts: LocalTimeParts): ClockHandAngles {
	const minuteFrac = parts.minutes + parts.seconds / 60 + parts.ms / 60000;
	const secondFrac = parts.seconds + parts.ms / 1000;
	const hourFrac = (parts.hours12 + minuteFrac / 60) / 12;
	return {
		hour: hourFrac * 360,
		minute: (minuteFrac / 60) * 360,
		second: (secondFrac / 60) * 360
	};
}

/** Hand rotations for a wall-clock instant in the given IANA timezone. */
export function clockHandAngles(instant: Date, timeZone: string): ClockHandAngles {
	return handAnglesFromParts(localTimeParts(instant, timeZone));
}

/** Hand rotations for scaled solar decimal hours (sub-second via fractional minute). */
export function solarHandAngles(decimalHours: number): ClockHandAngles {
	return handAnglesFromParts(decomposeDecimalHours(decimalHours));
}

export function formatClockDigital(
	instant: Date,
	timeZone: string,
	format: ClockFormat = '24'
): string {
	return formatInstant(instant, timeZone, format, { seconds: true });
}

export function formatSolarDigital(decimalHours: number, format: ClockFormat = '24'): string {
	return formatDecimalHours(decimalHours, format, { seconds: true });
}
