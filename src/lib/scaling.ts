import { PolarSunError } from './errors.js';
import { DEFAULT_SCALING, type ScalingConfig, type SunEvents } from './types.js';

const MS_PER_HOUR = 60 * 60 * 1000;
const NIGHT_SCALED_HOURS = 12;

function wrapSolarHours(hours: number): number {
	return ((hours % 24) + 24) % 24;
}

function assertNotPolar(events: SunEvents): void {
	if (events.polar !== null) {
		throw new PolarSunError();
	}
}

function scaledDayLength(cfg: ScalingConfig): number {
	return cfg.scaledSunsetHour - cfg.scaledSunriseHour;
}

/**
 * Map linear clock time to scaled solar hours in `[0, 24)`.
 */
export function scaleToSolar(
	now: Date,
	events: SunEvents,
	cfg: ScalingConfig = DEFAULT_SCALING
): number {
	assertNotPolar(events);

	const t = now.getTime();
	const sunrise = events.sunrise.getTime();
	const sunset = events.sunset.getTime();
	const nextSunrise = events.nextSunrise.getTime();
	const previousSunset = events.previousSunset.getTime();

	let scaled: number;

	if (t >= sunrise && t < sunset) {
		const dayLength = sunset - sunrise;
		const frac = (t - sunrise) / dayLength;
		scaled = cfg.scaledSunriseHour + scaledDayLength(cfg) * frac;
	} else if (t >= sunset && t < nextSunrise) {
		const nightLength = nextSunrise - sunset;
		const frac = (t - sunset) / nightLength;
		scaled = cfg.scaledSunsetHour + NIGHT_SCALED_HOURS * frac;
	} else if (t < sunrise) {
		const nightLength = sunrise - previousSunset;
		const frac = (t - previousSunset) / nightLength;
		scaled = cfg.scaledSunsetHour + NIGHT_SCALED_HOURS * frac;
	} else {
		scaled = cfg.scaledSunriseHour + 24;
	}

	return wrapSolarHours(scaled);
}

function linearFromDaySegment(solarHours: number, events: SunEvents, cfg: ScalingConfig): Date {
	const dayLength = events.sunset.getTime() - events.sunrise.getTime();
	const frac = (solarHours - cfg.scaledSunriseHour) / scaledDayLength(cfg);
	return new Date(events.sunrise.getTime() + dayLength * frac);
}

function linearFromNightSegment(
	solarHours: number,
	nightStart: number,
	nightEnd: number,
	cfg: ScalingConfig
): Date {
	const unwrapped = solarHours < cfg.scaledSunsetHour ? solarHours + 24 : solarHours;
	const frac = (unwrapped - cfg.scaledSunsetHour) / NIGHT_SCALED_HOURS;
	const nightLength = nightEnd - nightStart;
	return new Date(nightStart + nightLength * frac);
}

function inHalfOpenInterval(t: number, start: number, end: number): boolean {
	return t >= start && t < end;
}

/**
 * Inverse of {@link scaleToSolar}: map scaled solar hours in `[0, 24)` to a linear `Date`.
 */
export function scaleToLinear(
	solarHours: number,
	events: SunEvents,
	cfg: ScalingConfig = DEFAULT_SCALING
): Date {
	assertNotPolar(events);

	const h = wrapSolarHours(solarHours);

	if (h === cfg.scaledSunriseHour) {
		return new Date(events.sunrise.getTime());
	}
	if (h === cfg.scaledSunsetHour) {
		return new Date(events.sunset.getTime());
	}

	if (h > cfg.scaledSunriseHour && h < cfg.scaledSunsetHour) {
		return linearFromDaySegment(h, events, cfg);
	}

	const evening = linearFromNightSegment(
		h,
		events.sunset.getTime(),
		events.nextSunrise.getTime(),
		cfg
	);
	const preDawn = linearFromNightSegment(
		h,
		events.previousSunset.getTime(),
		events.sunrise.getTime(),
		cfg
	);

	const eveningValid = inHalfOpenInterval(
		evening.getTime(),
		events.sunset.getTime(),
		events.nextSunrise.getTime()
	);
	const preDawnValid = inHalfOpenInterval(
		preDawn.getTime(),
		events.previousSunset.getTime(),
		events.sunrise.getTime()
	);

	if (eveningValid && !preDawnValid) return evening;
	if (preDawnValid && !eveningValid) return preDawn;

	const candidates = eveningValid && preDawnValid ? [evening, preDawn] : [evening, preDawn];
	let best = candidates[0];
	let bestDelta = Infinity;
	for (const candidate of candidates) {
		const delta = hoursApart(scaleToSolar(candidate, events, cfg), h);
		if (delta < bestDelta) {
			bestDelta = delta;
			best = candidate;
		}
	}
	return best;
}

/** Decimal hours (UTC) from a `Date`. */
export function utcDecimalHours(d: Date): number {
	return (
		d.getUTCHours() +
		d.getUTCMinutes() / 60 +
		d.getUTCSeconds() / 3600 +
		d.getUTCMilliseconds() / 3_600_000
	);
}

/** Smallest difference in decimal hours on a 24 h clock. */
export function hoursApart(a: number, b: number): number {
	const diff = Math.abs(a - b);
	return Math.min(diff, 24 - diff);
}

export { MS_PER_HOUR };
