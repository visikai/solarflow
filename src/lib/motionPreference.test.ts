import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion } from './motionPreference.js';

function mockMatchMedia(reduced: boolean) {
	const matchMedia = vi.fn((query: string) => ({
		matches: query === '(prefers-reduced-motion: reduce)' && reduced,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn()
	}));
	vi.stubGlobal('window', { matchMedia });
}

describe('prefersReducedMotion', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns false when matchMedia is unavailable', () => {
		vi.stubGlobal('window', {});
		expect(prefersReducedMotion()).toBe(false);
	});

	it('returns true when the user prefers reduced motion', () => {
		mockMatchMedia(true);
		expect(prefersReducedMotion()).toBe(true);
	});

	it('returns false when the user does not prefer reduced motion', () => {
		mockMatchMedia(false);
		expect(prefersReducedMotion()).toBe(false);
	});
});
