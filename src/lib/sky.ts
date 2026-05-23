import SunCalc from 'suncalc';
import { computeSunEvents } from './sun.js';
import type { Location } from './types.js';

export interface SunArcSample {
	time: Date;
	/** Radians above the horizon; negative when below. */
	altitude: number;
	/** Radians from south (suncalc): 0 = south, +π/2 = west, −π/2 = east. */
	azimuth: number;
}

export interface SunArcDiagramLayout {
	width: number;
	height: number;
	/** Y coordinate of the horizon line. */
	horizonY: number;
	/** Vertical space for the arc above the horizon. */
	arcHeight: number;
	horizontalPadding: number;
}

const HALF_DAY_MS = 12 * 60 * 60 * 1000;

function isInvalidDate(d: Date): boolean {
	return Number.isNaN(d.getTime());
}

function sampleRange(loc: Location, start: Date, end: Date, samples: number): SunArcSample[] {
	const { latitude, longitude } = loc;
	const count = Math.max(1, samples);
	if (count === 1) {
		const pos = SunCalc.getPosition(start, latitude, longitude);
		return [{ time: start, altitude: pos.altitude, azimuth: pos.azimuth }];
	}

	const span = end.getTime() - start.getTime();
	const out: SunArcSample[] = [];
	for (let i = 0; i < count; i++) {
		const t = i / (count - 1);
		const time = new Date(start.getTime() + t * span);
		const pos = SunCalc.getPosition(time, latitude, longitude);
		out.push({ time, altitude: pos.altitude, azimuth: pos.azimuth });
	}
	return out;
}

/**
 * Sample the sun's path for a local calendar day: sunrise→sunset when defined,
 * otherwise a symmetric 24 h window around the day's solar-noon anchor (polar).
 */
export function sampleSunArc(loc: Location, date: Date, samples = 48): SunArcSample[] {
	const events = computeSunEvents(loc, date);

	if (events.polar === null && !isInvalidDate(events.sunrise) && !isInvalidDate(events.sunset)) {
		return sampleRange(loc, events.sunrise, events.sunset, samples);
	}

	const start = new Date(events.date.getTime() - HALF_DAY_MS);
	const end = new Date(events.date.getTime() + HALF_DAY_MS);
	return sampleRange(loc, start, end, samples);
}

/** Map suncalc azimuth to diagram x (east left, west right). */
export function azimuthToDiagramX(
	azimuth: number,
	layout: Pick<SunArcDiagramLayout, 'width' | 'horizontalPadding'>
): number {
	const t = (azimuth + Math.PI / 2) / Math.PI;
	const inner = layout.width - 2 * layout.horizontalPadding;
	return layout.horizontalPadding + t * inner;
}

/** Map altitude to diagram y (up = higher; below horizon when altitude < 0). */
export function altitudeToDiagramY(altitude: number, layout: SunArcDiagramLayout): number {
	const { horizonY, arcHeight } = layout;
	if (altitude >= 0) {
		const t = Math.min(1, altitude / (Math.PI / 2));
		return horizonY - t * arcHeight;
	}
	const depth = Math.min(1, -altitude / (Math.PI / 4));
	return horizonY + depth * arcHeight * 0.35;
}

export function sunSampleToDiagram(
	sample: Pick<SunArcSample, 'altitude' | 'azimuth'>,
	layout: SunArcDiagramLayout
): { x: number; y: number } {
	return {
		x: azimuthToDiagramX(sample.azimuth, layout),
		y: altitudeToDiagramY(sample.altitude, layout)
	};
}

/** SVG path for samples with altitude ≥ 0 (the visible arc). */
export function sunArcPathAboveHorizon(
	samples: SunArcSample[],
	layout: SunArcDiagramLayout
): string | null {
	const above = samples.filter((s) => s.altitude >= 0);
	if (above.length === 0) return null;

	const pts = above.map((s) => sunSampleToDiagram(s, layout));
	return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}

/** Peak altitude in degrees across samples. */
export function peakAltitudeDegrees(samples: SunArcSample[]): number {
	if (samples.length === 0) return -90;
	return (Math.max(...samples.map((s) => s.altitude)) * 180) / Math.PI;
}
