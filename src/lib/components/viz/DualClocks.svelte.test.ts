import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DualClocks from './DualClocks.svelte';

vi.mock('$lib/stores/time.js', async () => {
	const { readable: readableStore } = await import('svelte/store');
	const { scaleToSolar } = await import('../../scaling.js');
	const { computeSunEvents } = await import('../../sun.js');

	const newYork = {
		name: 'New York',
		latitude: 40.7128,
		longitude: -74.006,
		timezone: 'America/New_York'
	};
	const fixedNow = new Date('2024-03-20T14:30:00-04:00');
	const events = computeSunEvents(newYork, fixedNow);

	return {
		clockNow: readableStore(fixedNow),
		solarNow: readableStore(scaleToSolar(fixedNow, events))
	};
});

vi.mock('$lib/stores/location.js', async () => {
	const { readable: readableStore } = await import('svelte/store');
	return {
		location: readableStore({
			name: 'New York',
			latitude: 40.7128,
			longitude: -74.006,
			timezone: 'America/New_York'
		})
	};
});

describe('DualClocks', () => {
	afterEach(() => {
		cleanup();
	});

	it('matches snapshot for fixed location and date', () => {
		const { container } = render(DualClocks);
		expect(container.innerHTML).toMatchSnapshot();
	});
});
