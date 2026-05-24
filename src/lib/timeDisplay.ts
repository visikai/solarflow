import { decomposeDecimalHours } from './clockHands.js';
import type { ClockFormat } from './stores/clockFormat.js';

type TimePeriod = 'am' | 'pm';

export interface FormatDecimalHoursOptions {
	seconds?: boolean;
	compact?: boolean;
}

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

function format24h(
	hours24: number,
	minutes: number,
	seconds: number,
	opts: FormatDecimalHoursOptions
): string {
	if (opts.seconds) {
		return `${pad2(hours24)}:${pad2(minutes)}:${pad2(seconds)}`;
	}
	if (opts.compact) {
		return `${hours24}:${pad2(minutes)}`;
	}
	return `${pad2(hours24)}:${pad2(minutes)}`;
}

function format12h(
	hours24: number,
	minutes: number,
	seconds: number,
	opts: FormatDecimalHoursOptions
): string {
	const period: TimePeriod = hours24 < 12 ? 'am' : 'pm';
	const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
	const time = opts.compact
		? `${hour12}:${pad2(minutes)}`
		: `${hour12}:${pad2(minutes)}${opts.seconds ? `:${pad2(seconds)}` : ''}`;
	return `${time} ${period}`;
}

/** Format decimal hours (clock or solar) for display. */
export function formatDecimalHours(
	decimalHours: number,
	format: ClockFormat,
	opts: FormatDecimalHoursOptions = {}
): string {
	const { hours24, minutes, seconds } = decomposeDecimalHours(decimalHours);
	if (format === '24') {
		return format24h(hours24, minutes, seconds, opts);
	}
	return format12h(hours24, minutes, seconds, opts);
}

/** Format a civil clock instant in the given IANA timezone. */
export function formatInstant(
	instant: Date,
	timeZone: string,
	format: ClockFormat,
	opts: FormatDecimalHoursOptions = {}
): string {
	if (format === '24') {
		return new Intl.DateTimeFormat('en-GB', {
			timeZone,
			hour: '2-digit',
			minute: '2-digit',
			second: opts.seconds ? '2-digit' : undefined,
			hour12: false
		}).format(instant);
	}

	return new Intl.DateTimeFormat('en-US', {
		timeZone,
		hour: 'numeric',
		minute: '2-digit',
		second: opts.seconds ? '2-digit' : undefined,
		hour12: true
	})
		.format(instant)
		.toLowerCase()
		.replace(/\s/g, ' ');
}

/** Y-axis tick label for yearly drift chart (0–24 h scale). */
export function formatDecimalHoursAxis(hours: number, format: ClockFormat): string {
	if (format === '24') {
		return String(hours);
	}
	if (hours === 0 || hours === 24) return '12 am';
	if (hours === 12) return '12 pm';
	if (hours < 12) return `${hours} am`;
	return `${hours - 12} pm`;
}
