import { derived, readable, type Readable } from 'svelte/store';
import { scaleToSolar } from '../scaling.js';
import { computeSunEvents } from '../sun.js';
import { location } from './location.js';

function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined' || !window.matchMedia) return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function createLinearNowStore(): Readable<Date> {
	let subscriberCount = 0;
	let rafId: number | undefined;
	let intervalId: ReturnType<typeof setInterval> | undefined;
	let motionUnsubscribe: (() => void) | undefined;

	return readable(new Date(), (set) => {
		subscriberCount += 1;

		const tick = () => {
			set(new Date());
		};

		const stopSchedule = () => {
			if (rafId !== undefined) {
				cancelAnimationFrame(rafId);
				rafId = undefined;
			}
			if (intervalId !== undefined) {
				clearInterval(intervalId);
				intervalId = undefined;
			}
		};

		const schedule = () => {
			stopSchedule();
			if (prefersReducedMotion()) {
				intervalId = setInterval(tick, 1000);
			} else if (typeof requestAnimationFrame === 'function') {
				const frame = () => {
					tick();
					rafId = requestAnimationFrame(frame);
				};
				rafId = requestAnimationFrame(frame);
			}
		};

		const onMotionChange = () => {
			if (subscriberCount > 0) schedule();
		};

		if (subscriberCount === 1) {
			tick();
			if (typeof window !== 'undefined') {
				schedule();
			}
			if (typeof window !== 'undefined' && window.matchMedia) {
				const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
				mq.addEventListener('change', onMotionChange);
				motionUnsubscribe = () => mq.removeEventListener('change', onMotionChange);
			}
		}

		return () => {
			subscriberCount -= 1;
			if (subscriberCount === 0) {
				stopSchedule();
				motionUnsubscribe?.();
				motionUnsubscribe = undefined;
			}
		};
	});
}

/** Wall-clock now; one global rAF (or 1 s interval when reduced motion). */
export const linearNow = createLinearNowStore();

/** Scaled solar hours for `$linearNow` at `$location`, or `null` in polar conditions. */
export const solarNow: Readable<number | null> = derived([linearNow, location], ([$now, $loc]) => {
	const events = computeSunEvents($loc, $now);
	if (events.polar !== null) return null;
	return scaleToSolar($now, events);
});
