import { describe, expect, it } from 'vitest';
import {
	decomposeDecimalHours,
	formatLinearDigital,
	formatSolarDigital,
	handTip,
	linearHandAngles,
	radiansFrom12oclock,
	solarHandAngles
} from './clockHands.js';

describe('radiansFrom12oclock / handTip', () => {
	it('maps 12 o’clock to pointing up', () => {
		const tip = handTip(100, 100, 50, 0);
		expect(tip.x).toBeCloseTo(100, 5);
		expect(tip.y).toBeCloseTo(50, 5);
	});

	it('maps 3 o’clock to pointing right', () => {
		const tip = handTip(100, 100, 50, 90);
		expect(tip.x).toBeCloseTo(150, 5);
		expect(tip.y).toBeCloseTo(100, 5);
	});

	it('matches tick mark convention at 6 o’clock', () => {
		const angle = radiansFrom12oclock(180);
		expect(Math.cos(angle)).toBeCloseTo(0, 5);
		expect(Math.sin(angle)).toBeCloseTo(1, 5);
	});
});

describe('decomposeDecimalHours', () => {
	it('splits fractional solar hours into h/m/s/ms', () => {
		const parts = decomposeDecimalHours(14.512345);
		expect(parts.hours24).toBe(14);
		expect(parts.hours12).toBe(2);
		expect(parts.minutes).toBe(30);
		expect(parts.seconds).toBe(44);
		expect(parts.ms).toBeCloseTo(442, 0);
	});

	it('wraps hours into [0, 24)', () => {
		expect(decomposeDecimalHours(25.5).hours24).toBe(1);
	});
});

describe('linearHandAngles', () => {
	it('returns noon-aligned hour hand at local noon', () => {
		const instant = new Date('2024-03-20T12:00:00-04:00');
		const angles = linearHandAngles(instant, 'America/New_York');
		expect(angles.hour).toBe(0);
		expect(angles.minute).toBe(0);
		expect(angles.second).toBe(0);
	});

	it('offsets minute and second hands at 14:30:45', () => {
		const instant = new Date('2024-03-20T14:30:45-04:00');
		const angles = linearHandAngles(instant, 'America/New_York');
		const hourFrac = (2 + (30 + 45 / 60) / 60) / 12;
		expect(angles.hour).toBeCloseTo(hourFrac * 360, 5);
		expect(angles.minute).toBeCloseTo((30.75 / 60) * 360, 5);
		expect(angles.second).toBeCloseTo((45 / 60) * 360, 5);
	});
});

describe('solarHandAngles', () => {
	it('uses sub-minute fraction for the second hand', () => {
		const angles = solarHandAngles(6.508333);
		const { minutes, seconds, ms } = decomposeDecimalHours(6.508333);
		const secondFrac = seconds + ms / 1000;
		expect(minutes).toBe(30);
		expect(angles.second).toBeCloseTo((secondFrac / 60) * 360, 2);
	});

	it('aligns scaled noon to 12 o’clock', () => {
		const angles = solarHandAngles(12);
		expect(angles.hour).toBe(0);
		expect(angles.minute).toBe(0);
		expect(angles.second).toBe(0);
	});
});

describe('digital formatting', () => {
	it('formats linear time as HH:MM:SS', () => {
		const instant = new Date('2024-03-20T14:30:45-04:00');
		expect(formatLinearDigital(instant, 'America/New_York')).toBe('14:30:45');
	});

	it('formats solar decimal hours as HH:MM:SS', () => {
		expect(formatSolarDigital(14.512345)).toBe('14:30:44');
	});
});
