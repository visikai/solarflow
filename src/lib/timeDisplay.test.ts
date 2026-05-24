import { describe, expect, it } from 'vitest';
import { formatDecimalHours, formatDecimalHoursAxis, formatInstant } from './timeDisplay.js';

describe('formatDecimalHours', () => {
	it('formats 24h with seconds', () => {
		expect(formatDecimalHours(14.512345, '24', { seconds: true })).toBe('14:30:44');
	});

	it('formats 24h compact', () => {
		expect(formatDecimalHours(6.5, '24', { compact: true })).toBe('6:30');
	});

	it('formats 12h with seconds', () => {
		expect(formatDecimalHours(14.512345, '12', { seconds: true })).toBe('2:30:44 pm');
	});

	it('formats midnight and noon in 12h', () => {
		expect(formatDecimalHours(0, '12')).toBe('12:00 am');
		expect(formatDecimalHours(12, '12')).toBe('12:00 pm');
	});

	it('formats 12h compact', () => {
		expect(formatDecimalHours(6.5, '12', { compact: true })).toBe('6:30 am');
	});
});

describe('formatInstant', () => {
	const instant = new Date('2024-03-20T14:30:45-04:00');

	it('formats 24h in timezone', () => {
		expect(formatInstant(instant, 'America/New_York', '24', { seconds: true })).toBe('14:30:45');
	});

	it('formats 12h in timezone', () => {
		expect(formatInstant(instant, 'America/New_York', '12', { seconds: true })).toBe('2:30:45 pm');
	});
});

describe('formatDecimalHoursAxis', () => {
	it('returns 24h numbers', () => {
		expect(formatDecimalHoursAxis(6, '24')).toBe('6');
		expect(formatDecimalHoursAxis(18, '24')).toBe('18');
	});

	it('returns 12h labels', () => {
		expect(formatDecimalHoursAxis(0, '12')).toBe('12 am');
		expect(formatDecimalHoursAxis(6, '12')).toBe('6 am');
		expect(formatDecimalHoursAxis(12, '12')).toBe('12 pm');
		expect(formatDecimalHoursAxis(18, '12')).toBe('6 pm');
		expect(formatDecimalHoursAxis(24, '12')).toBe('12 am');
	});
});
