import { describe, expect, it } from 'vitest';
import { PRESETS } from './presets.js';

function isRecognizedIanaTimezone(tz: string): boolean {
	try {
		const resolved = Intl.DateTimeFormat(undefined, { timeZone: tz }).resolvedOptions().timeZone;
		return resolved === tz;
	} catch {
		return false;
	}
}

describe('PRESETS', () => {
	it('has ~30 cities spanning latitudes', () => {
		expect(PRESETS.length).toBeGreaterThanOrEqual(30);
		expect(PRESETS.length).toBeLessThanOrEqual(32);
	});

	it('every preset timezone is a recognized IANA zone', () => {
		for (const preset of PRESETS) {
			expect(isRecognizedIanaTimezone(preset.timezone), `${preset.name}: ${preset.timezone}`).toBe(
				true
			);
		}
	});
});
