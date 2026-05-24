import { describe, expect, it } from 'vitest';
import { formatTimeInput, parseTimeInput } from './timeInput.js';

describe('formatTimeInput', () => {
	it('round-trips whole hours through parse', () => {
		expect(parseTimeInput(formatTimeInput(9))).toBe(9);
		expect(parseTimeInput(formatTimeInput(14.5))).toBeCloseTo(14.5, 5);
	});

	it('carries minute overflow from rounding (e.g. 6:59:30 → 07:00)', () => {
		const justBeforeSeven = 6 + 59.5 / 60;
		expect(formatTimeInput(justBeforeSeven)).toBe('07:00');
	});

	it('does not snap near-hour values back to the previous hour', () => {
		const sixFiftyNine = 6 + 59 / 60;
		expect(formatTimeInput(sixFiftyNine)).toBe('06:59');
	});
});
