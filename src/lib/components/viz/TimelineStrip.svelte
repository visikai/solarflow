<script lang="ts">
	import { scaleToLinear } from '$lib/scaling.js';
	import { computeSunEvents } from '$lib/sun.js';
	import { location } from '$lib/stores/location.js';
	import { linearNow, solarNow } from '$lib/stores/time.js';
	import type { SunEvents } from '$lib/types.js';

	const WIDTH = 1000;
	const HEIGHT = 72;
	const STRIP_Y = 20;
	const STRIP_H = 32;
	const TICK_TOP = 12;
	const TICK_H = 40;

	let events = $derived(computeSunEvents($location, $linearNow));
	let polar = $derived(events.polar);

	function localDecimalHours(instant: Date, timeZone: string): number {
		const parts = new Intl.DateTimeFormat('en-GB', {
			timeZone,
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
			hour12: false
		}).formatToParts(instant);
		const hour = Number(parts.find((p) => p.type === 'hour')!.value);
		const minute = Number(parts.find((p) => p.type === 'minute')!.value);
		const second = Number(parts.find((p) => p.type === 'second')!.value);
		return hour + minute / 60 + second / 3600;
	}

	function xForHours(hours: number): number {
		return (hours / 24) * WIDTH;
	}

	function formatLocalTime(instant: Date, timeZone: string): string {
		return new Intl.DateTimeFormat(undefined, {
			timeZone,
			hour: 'numeric',
			minute: '2-digit',
			second: '2-digit'
		}).format(instant);
	}

	function formatSolarTime(hours: number): string {
		const h = Math.floor(hours) % 24;
		const m = Math.floor((hours % 1) * 60);
		const s = Math.floor(((hours % 1) * 60 - m) * 60);
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}

	function tickLabel(instant: Date, timeZone: string): string {
		return new Intl.DateTimeFormat(undefined, {
			timeZone,
			hour: 'numeric',
			minute: '2-digit'
		}).format(instant);
	}

	function segmentRects(ev: SunEvents): { x: number; width: number; kind: 'night' | 'day' }[] {
		if (ev.polar !== null) return [];

		const tz = $location.timezone;
		const sunriseH = localDecimalHours(ev.sunrise, tz);
		const sunsetH = localDecimalHours(ev.sunset, tz);
		const segments: { x: number; width: number; kind: 'night' | 'day' }[] = [];

		segments.push({ x: 0, width: xForHours(sunriseH), kind: 'night' });
		segments.push({
			x: xForHours(sunriseH),
			width: xForHours(sunsetH) - xForHours(sunriseH),
			kind: 'day'
		});
		segments.push({
			x: xForHours(sunsetH),
			width: WIDTH - xForHours(sunsetH),
			kind: 'night'
		});
		return segments;
	}

	let segments = $derived(segmentRects(events));

	let linearMarkerX = $derived(
		polar === null ? xForHours(localDecimalHours($linearNow, $location.timezone)) : null
	);

	let solarMarkerX = $derived.by(() => {
		if (polar !== null || $solarNow === null) return null;
		const linearInstant = scaleToLinear($solarNow, events);
		return xForHours(localDecimalHours(linearInstant, $location.timezone));
	});

	let solarTooltip = $derived(
		$solarNow === null
			? ''
			: `Solar ${formatSolarTime($solarNow)} (${formatLocalTime(scaleToLinear($solarNow, events), $location.timezone)} local)`
	);
</script>

<div class="timeline-strip">
	<svg
		class="timeline-svg"
		viewBox="0 0 {WIDTH} {HEIGHT}"
		width="100%"
		height={HEIGHT}
		role="img"
		aria-label="24-hour timeline with linear and solar now markers"
	>
		{#if polar !== null}
			<rect class="polar-bg" x="0" y={STRIP_Y} width={WIDTH} height={STRIP_H} rx="4" />
			<text
				class="polar-label"
				x={WIDTH / 2}
				y={STRIP_Y + STRIP_H / 2}
				text-anchor="middle"
				dominant-baseline="middle"
			>
				{polar === 'day'
					? 'Polar day — sun stays above the horizon'
					: 'Polar night — sun stays below the horizon'}
			</text>
		{:else}
			{#each segments as seg (seg.kind + seg.x)}
				<rect
					class="segment"
					class:night={seg.kind === 'night'}
					class:day={seg.kind === 'day'}
					x={seg.x}
					y={STRIP_Y}
					width={seg.width}
					height={STRIP_H}
				/>
			{/each}

			{#each [{ t: events.sunrise, label: 'Sunrise' }, { t: events.solarNoon, label: 'Noon' }, { t: events.sunset, label: 'Sunset' }] as tick (tick.label)}
				{@const x = xForHours(localDecimalHours(tick.t, $location.timezone))}
				<line class="tick" x1={x} y1={TICK_TOP} x2={x} y2={TICK_TOP + TICK_H} />
				<text class="tick-label" {x} y={TICK_TOP - 2} text-anchor="middle">
					{tickLabel(tick.t, $location.timezone)}
				</text>
				<text class="tick-sublabel" {x} y={HEIGHT - 4} text-anchor="middle">
					{tick.label}
				</text>
			{/each}

			{#if linearMarkerX !== null}
				<g class="marker linear" transform="translate({linearMarkerX}, 0)">
					<line class="marker-line" x1="0" y1={TICK_TOP} x2="0" y2={TICK_TOP + TICK_H + 4} />
					<circle class="marker-cap" cx="0" cy={TICK_TOP} r="4" />
					<title>Linear {formatLocalTime($linearNow, $location.timezone)}</title>
				</g>
			{/if}

			{#if solarMarkerX !== null}
				<g class="marker solar" transform="translate({solarMarkerX}, 0)">
					<line class="marker-line" x1="0" y1={TICK_TOP} x2="0" y2={TICK_TOP + TICK_H + 4} />
					<polygon
						class="marker-cap"
						points="0,{TICK_TOP - 5} -5,{TICK_TOP + 3} 5,{TICK_TOP + 3}"
					/>
					<title>{solarTooltip}</title>
				</g>
			{/if}
		{/if}
	</svg>
</div>

<style>
	.timeline-strip {
		width: 100%;
	}

	.timeline-svg {
		display: block;
		max-width: 100%;
	}

	.segment.night {
		fill: var(--color-night);
	}

	.segment.day {
		fill: var(--color-day);
	}

	.polar-bg {
		fill: var(--color-night);
		opacity: 0.35;
	}

	.polar-label {
		fill: var(--color-fg);
		font-size: 14px;
		font-family: inherit;
	}

	.tick {
		stroke: var(--color-fg);
		stroke-width: 1;
		opacity: 0.35;
	}

	.tick-label,
	.tick-sublabel {
		fill: var(--color-fg);
		font-size: 11px;
		font-family: inherit;
	}

	.tick-sublabel {
		opacity: 0.65;
		font-size: 10px;
	}

	.marker-line {
		stroke-width: 2.5;
	}

	.marker.linear .marker-line,
	.marker.linear .marker-cap {
		stroke: var(--color-accent-linear);
		fill: var(--color-accent-linear);
	}

	.marker.solar .marker-line,
	.marker.solar .marker-cap {
		stroke: var(--color-accent-solar);
		fill: var(--color-accent-solar);
	}

	.marker.linear .marker-line {
		stroke: var(--color-accent-linear);
	}

	.marker.solar .marker-line {
		stroke: var(--color-accent-solar);
	}
</style>
