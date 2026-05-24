import { describe, expect, it } from 'vitest';
import { PRESETS } from '../presets.js';
import { sunEventsCacheKey } from './sunEvents.js';

const NEW_YORK = PRESETS.find((p) => p.name.includes('New York'))!;

describe('sunEventsCacheKey', () => {
	it('changes only when local calendar day or location changes', () => {
		const a = new Date('2024-06-21T10:00:00-04:00');
		const b = new Date('2024-06-21T22:00:00-04:00');
		const c = new Date('2024-06-22T10:00:00-04:00');
		expect(sunEventsCacheKey(a, NEW_YORK)).toBe(sunEventsCacheKey(b, NEW_YORK));
		expect(sunEventsCacheKey(a, NEW_YORK)).not.toBe(sunEventsCacheKey(c, NEW_YORK));
	});
});
