import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clockDayNightHours, formatDayNightSummary } from '../../dayLength.js';
import { computeSunEvents } from '../../sun.js';
import TimelineStrip from './TimelineStrip.svelte';

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

vi.mock('$lib/stores/sunEvents.js', async () => {
	const { readable: readableStore } = await import('svelte/store');
	const { computeSunEvents } = await import('../../sun.js');
	const newYork = {
		name: 'New York',
		latitude: 40.7128,
		longitude: -74.006,
		timezone: 'America/New_York'
	};
	const fixedNow = new Date('2024-03-20T14:30:00-04:00');
	return {
		sunEvents: readableStore(computeSunEvents(newYork, fixedNow))
	};
});

describe('TimelineStrip', () => {
	afterEach(() => {
		cleanup();
	});

	it('matches snapshot for fixed location and date', () => {
		const { container } = render(TimelineStrip);
		expect(container.innerHTML).toMatchSnapshot();
	});

	it('computes day length for the mocked NYC equinox', () => {
		const newYork = {
			name: 'New York',
			latitude: 40.7128,
			longitude: -74.006,
			timezone: 'America/New_York'
		};
		const sun = computeSunEvents(newYork, new Date('2024-03-20T14:30:00-04:00'));
		const { daylightHours, nightHours } = clockDayNightHours(sun);
		expect(formatDayNightSummary(daylightHours, nightHours)).toBe(
			'12h 9m daylight · 11h 51m night'
		);
	});

	it('shows clock daylight and night hours between timeline rows', () => {
		const { container } = render(TimelineStrip);
		const summary = container.querySelector('.day-night-summary');
		expect(summary?.textContent).toMatch(/^\d+h.*daylight · \d+h.*night$/);
		expect(summary?.textContent).not.toMatch(/NaN/);
	});
});
