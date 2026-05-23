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

/** Degrees clockwise from 12 o'clock; suitable for SVG `rotate()` (0° = pointing up). */
export function svgRotationFrom12oclock(degreesFrom12: number): number {
	return degreesFrom12 - 90;
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
		hour: svgRotationFrom12oclock(hourFrac * 360),
		minute: svgRotationFrom12oclock((minuteFrac / 60) * 360),
		second: svgRotationFrom12oclock((secondFrac / 60) * 360)
	};
}

/** Hand rotations for a wall-clock instant in the given IANA timezone. */
export function linearHandAngles(instant: Date, timeZone: string): ClockHandAngles {
	return handAnglesFromParts(localTimeParts(instant, timeZone));
}

/** Hand rotations for scaled solar decimal hours (sub-second via fractional minute). */
export function solarHandAngles(decimalHours: number): ClockHandAngles {
	return handAnglesFromParts(decomposeDecimalHours(decimalHours));
}

export function formatLinearDigital(instant: Date, timeZone: string): string {
	return new Intl.DateTimeFormat('en-GB', {
		timeZone,
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	}).format(instant);
}

export function formatSolarDigital(decimalHours: number): string {
	const { hours24, minutes, seconds } = decomposeDecimalHours(decimalHours);
	return `${String(hours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
