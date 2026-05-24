import { currentDayOfYear } from './yearlyDrift.js';

export type SeasonKind =
	| 'march_equinox'
	| 'june_solstice'
	| 'september_equinox'
	| 'december_solstice';

export interface SeasonEvent {
	kind: SeasonKind;
	/** Astronomical moment (UTC). */
	instant: Date;
	/** 1-based local day-of-year in `timeZone` for the chart year. */
	dayOfYear: number;
	/** e.g. "spring equinox" */
	label: string;
}

export interface SeasonChartMarker {
	doy: number;
	label: string;
}

export interface SeasonTimelineCopy {
	todayLine: string | null;
	nextLine: string;
}

const EQUATOR_NEUTRAL_LAT_THRESHOLD = 5;
const BISECT_TOLERANCE_MS = 60_000;

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

/** Sun declination in radians at `instant` (observer-independent). */
export function sunDeclinationRad(instant: Date): number {
	const jd = instant.getTime() / 86400000 + 2440587.5;
	const n = jd - 2451545.0;
	const l = ((280.46 + 0.9856474 * n + 360) % 360) * (Math.PI / 180);
	const g = ((357.528 + 0.9856003 * n + 360) % 360) * (Math.PI / 180);
	const lambda = l + ((1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * Math.PI) / 180;
	const epsilon = (23.439 - 0.0000004 * n) * (Math.PI / 180);
	return Math.asin(Math.sin(epsilon) * Math.sin(lambda));
}

function utcDate(year: number, month: number, day: number, hour = 12): Date {
	return new Date(Date.UTC(year, month - 1, day, hour, 0, 0, 0));
}

function bisectZeroCrossing(start: Date, end: Date, wantPositiveSlope: boolean): Date {
	let lo = start.getTime();
	let hi = end.getTime();
	const decLo = sunDeclinationRad(new Date(lo));
	const decHi = sunDeclinationRad(new Date(hi));
	if (wantPositiveSlope && (decLo >= 0 || decHi <= 0)) {
		// fallback: scan hourly
		for (let t = lo; t < hi; t += 3_600_000) {
			const d0 = sunDeclinationRad(new Date(t));
			const d1 = sunDeclinationRad(new Date(t + 3_600_000));
			if (d0 <= 0 && d1 >= 0) {
				lo = t;
				hi = t + 3_600_000;
				break;
			}
		}
	}
	if (!wantPositiveSlope && (decLo <= 0 || decHi >= 0)) {
		for (let t = lo; t < hi; t += 3_600_000) {
			const d0 = sunDeclinationRad(new Date(t));
			const d1 = sunDeclinationRad(new Date(t + 3_600_000));
			if (d0 >= 0 && d1 <= 0) {
				lo = t;
				hi = t + 3_600_000;
				break;
			}
		}
	}

	while (hi - lo > BISECT_TOLERANCE_MS) {
		const mid = (lo + hi) / 2;
		const decMid = sunDeclinationRad(new Date(mid));
		if (wantPositiveSlope) {
			if (decMid <= 0) lo = mid;
			else hi = mid;
		} else if (decMid >= 0) {
			lo = mid;
		} else {
			hi = mid;
		}
	}
	return new Date((lo + hi) / 2);
}

function bisectExtremum(start: Date, end: Date, findMax: boolean): Date {
	let lo = start.getTime();
	let hi = end.getTime();
	while (hi - lo > BISECT_TOLERANCE_MS) {
		const third = (hi - lo) / 3;
		const m1 = lo + third;
		const m2 = hi - third;
		const d1 = sunDeclinationRad(new Date(m1));
		const d2 = sunDeclinationRad(new Date(m2));
		if (findMax) {
			if (d1 < d2) lo = m1;
			else hi = m2;
		} else if (d1 > d2) {
			lo = m1;
		} else {
			hi = m2;
		}
	}
	return new Date((lo + hi) / 2);
}

function findSeasonInstant(year: number, kind: SeasonKind): Date {
	switch (kind) {
		case 'march_equinox':
			return bisectZeroCrossing(utcDate(year, 3, 10), utcDate(year, 3, 30), true);
		case 'june_solstice':
			return bisectExtremum(utcDate(year, 6, 1), utcDate(year, 6, 30), true);
		case 'september_equinox':
			return bisectZeroCrossing(utcDate(year, 9, 10), utcDate(year, 9, 30), false);
		case 'december_solstice':
			return bisectExtremum(utcDate(year, 12, 1), utcDate(year, 12, 31), false);
	}
}

const SEASON_KINDS: SeasonKind[] = [
	'march_equinox',
	'june_solstice',
	'september_equinox',
	'december_solstice'
];

/** Hemisphere-aware display name for a season event. */
export function seasonLabel(kind: SeasonKind, latitude: number): string {
	const absLat = Math.abs(latitude);
	if (absLat < EQUATOR_NEUTRAL_LAT_THRESHOLD) {
		switch (kind) {
			case 'march_equinox':
				return 'March equinox';
			case 'june_solstice':
				return 'June solstice';
			case 'september_equinox':
				return 'September equinox';
			case 'december_solstice':
				return 'December solstice';
		}
	}

	const northern = latitude >= 0;
	switch (kind) {
		case 'march_equinox':
			return northern ? 'spring equinox' : 'autumn equinox';
		case 'june_solstice':
			return northern ? 'summer solstice' : 'winter solstice';
		case 'september_equinox':
			return northern ? 'autumn equinox' : 'spring equinox';
		case 'december_solstice':
			return northern ? 'winter solstice' : 'summer solstice';
	}
}

function localDateKey(instant: Date, timeZone: string): string {
	const { year, month, day } = calendarPartsInZone(instant, timeZone);
	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function civicDaysBetween(fromKey: string, toKey: string): number {
	const [fy, fm, fd] = fromKey.split('-').map(Number);
	const [ty, tm, td] = toKey.split('-').map(Number);
	const fromUtc = Date.UTC(fy, fm - 1, fd);
	const toUtc = Date.UTC(ty, tm - 1, td);
	return Math.round((toUtc - fromUtc) / 86_400_000);
}

function eventDayOfYear(instant: Date, timeZone: string, year: number): number {
	const doy = currentDayOfYear(timeZone, year, instant);
	if (doy != null) return doy;
	const parts = calendarPartsInZone(instant, timeZone);
	if (parts.year < year) return 1;
	return currentDayOfYear(timeZone, parts.year, instant) ?? 1;
}

/** Four astronomical season events for `year`, sorted by local day-of-year. */
export function seasonEventsForYear(
	year: number,
	timeZone: string,
	latitude: number
): SeasonEvent[] {
	const events: SeasonEvent[] = SEASON_KINDS.map((kind) => {
		const instant = findSeasonInstant(year, kind);
		return {
			kind,
			instant,
			dayOfYear: eventDayOfYear(instant, timeZone, year),
			label: seasonLabel(kind, latitude)
		};
	});

	return events.sort((a, b) => a.dayOfYear - b.dayOfYear);
}

/** Chart markers for the yearly drift x-axis. */
export function seasonMarkersForChart(
	year: number,
	timeZone: string,
	latitude: number
): SeasonChartMarker[] {
	return seasonEventsForYear(year, timeZone, latitude).map((e) => ({
		doy: e.dayOfYear,
		label: e.label
	}));
}

function formatTodayLine(label: string): string {
	return `Today is the ${label}.`;
}

function formatCountdownLine(days: number, label: string): string {
	if (days === 1) return `Tomorrow is the ${label}.`;
	return `${days} days until the ${label}.`;
}

function orderedEventsAround(now: Date, timeZone: string, latitude: number): SeasonEvent[] {
	const year = calendarPartsInZone(now, timeZone).year;
	const thisYear = seasonEventsForYear(year, timeZone, latitude);
	const nextYear = seasonEventsForYear(year + 1, timeZone, latitude);
	return [...thisYear, ...nextYear];
}

/** Copy for the timeline strip between clock and solar rows. */
export function seasonTimelineCopy(
	now: Date,
	timeZone: string,
	latitude: number
): SeasonTimelineCopy {
	const todayKey = localDateKey(now, timeZone);
	const events = orderedEventsAround(now, timeZone, latitude);

	let todayEvent: SeasonEvent | null = null;
	for (const e of events) {
		if (localDateKey(e.instant, timeZone) === todayKey) {
			todayEvent = e;
			break;
		}
	}

	const todayLine = todayEvent ? formatTodayLine(todayEvent.label) : null;

	let nextEvent: SeasonEvent | null = null;
	for (const e of events) {
		const eventKey = localDateKey(e.instant, timeZone);
		if (civicDaysBetween(todayKey, eventKey) > 0) {
			nextEvent = e;
			break;
		}
	}

	if (!nextEvent) {
		const year = calendarPartsInZone(now, timeZone).year;
		const fallback = seasonEventsForYear(year + 1, timeZone, latitude)[0];
		nextEvent = fallback;
	}

	const days = civicDaysBetween(todayKey, localDateKey(nextEvent.instant, timeZone));
	const nextLine = formatCountdownLine(days, nextEvent.label);

	return { todayLine, nextLine };
}
