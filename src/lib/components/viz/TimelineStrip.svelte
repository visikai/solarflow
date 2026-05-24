<script lang="ts">
	import { DEFAULT_SCALING } from '$lib/types.js';
	import { location } from '$lib/stores/location.js';
	import { sunEvents } from '$lib/stores/sunEvents.js';
	import { linearNow, solarNow } from '$lib/stores/time.js';
	import type { SunEvents } from '$lib/types.js';

	const WIDTH = 1000;
	const HEIGHT = 72;
	const STRIP_Y = 20;
	const STRIP_H = 32;
	const TICK_TOP = 12;
	const TICK_H = 40;

	const { scaledSunriseHour, scaledSunsetHour } = DEFAULT_SCALING;

	let events = $derived($sunEvents);
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

	function formatFixedSolarHour(hours: number): string {
		return `${String(hours).padStart(2, '0')}:00`;
	}

	function tickLabel(instant: Date, timeZone: string): string {
		return new Intl.DateTimeFormat(undefined, {
			timeZone,
			hour: 'numeric',
			minute: '2-digit'
		}).format(instant);
	}

	type Segment = { x: number; width: number; kind: 'night' | 'day' };
	type Tick = { x: number; label: string; sublabel: string };

	function linearSegmentRects(ev: SunEvents): Segment[] {
		if (ev.polar !== null) return [];

		const tz = $location.timezone;
		const sunriseH = localDecimalHours(ev.sunrise, tz);
		const sunsetH = localDecimalHours(ev.sunset, tz);

		return [
			{ x: 0, width: xForHours(sunriseH), kind: 'night' },
			{
				x: xForHours(sunriseH),
				width: xForHours(sunsetH) - xForHours(sunriseH),
				kind: 'day'
			},
			{
				x: xForHours(sunsetH),
				width: WIDTH - xForHours(sunsetH),
				kind: 'night'
			}
		];
	}

	function solarSegmentRects(): Segment[] {
		return [
			{ x: 0, width: xForHours(scaledSunriseHour), kind: 'night' },
			{
				x: xForHours(scaledSunriseHour),
				width: xForHours(scaledSunsetHour) - xForHours(scaledSunriseHour),
				kind: 'day'
			},
			{
				x: xForHours(scaledSunsetHour),
				width: WIDTH - xForHours(scaledSunsetHour),
				kind: 'night'
			}
		];
	}

	function linearTicks(ev: SunEvents): Tick[] {
		const tz = $location.timezone;
		return [
			{ t: ev.sunrise, label: tickLabel(ev.sunrise, tz), sublabel: 'Sunrise' },
			{ t: ev.solarNoon, label: tickLabel(ev.solarNoon, tz), sublabel: 'Noon' },
			{ t: ev.sunset, label: tickLabel(ev.sunset, tz), sublabel: 'Sunset' }
		].map((tick) => ({
			x: xForHours(localDecimalHours(tick.t, tz)),
			label: tick.label,
			sublabel: tick.sublabel
		}));
	}

	function solarTicks(): Tick[] {
		return [
			{ hours: scaledSunriseHour, sublabel: 'Sunrise' },
			{ hours: 12, sublabel: 'Noon' },
			{ hours: scaledSunsetHour, sublabel: 'Sunset' }
		].map((tick) => ({
			x: xForHours(tick.hours),
			label: formatFixedSolarHour(tick.hours),
			sublabel: tick.sublabel
		}));
	}

	let linearSegments = $derived(linearSegmentRects(events));
	let solarSegments = $derived(solarSegmentRects());
	let linearTicksList = $derived(linearTicks(events));
	let solarTicksList = $derived(solarTicks());

	let linearMarkerX = $derived(
		polar === null ? xForHours(localDecimalHours($linearNow, $location.timezone)) : null
	);

	let solarMarkerX = $derived(polar === null && $solarNow !== null ? xForHours($solarNow) : null);

	let timelineSummary = $derived.by(() => {
		const tz = $location.timezone;
		const linear = formatLocalTime($linearNow, tz);
		if (polar !== null) {
			const mode = polar === 'day' ? 'polar day' : 'polar night';
			return `${mode}. Linear time ${linear}. Solar time is not shown on the timeline.`;
		}
		const sunrise = formatLocalTime(events.sunrise, tz);
		const sunset = formatLocalTime(events.sunset, tz);
		const solarPart =
			$solarNow === null ? 'Solar time unavailable.' : `Solar time ${formatSolarTime($solarNow)}.`;
		return `Linear time ${linear}. ${solarPart} Sunrise ${sunrise}, sunset ${sunset}.`;
	});
</script>

<div class="timeline-strip">
	<p class="sr-only" aria-live="polite">{timelineSummary}</p>

	<div class="timeline-row">
		<span class="row-label" id="timeline-linear-label">Linear</span>
		<svg
			class="timeline-svg"
			viewBox="0 0 {WIDTH} {HEIGHT}"
			width="100%"
			height={HEIGHT}
			role="img"
			aria-labelledby="timeline-linear-label"
			aria-label="Linear clock timeline with sunrise, noon, and sunset at local times"
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
				{#each linearSegments as seg (seg.kind + seg.x)}
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

				{#each linearTicksList as tick (tick.sublabel)}
					<line class="tick" x1={tick.x} y1={TICK_TOP} x2={tick.x} y2={TICK_TOP + TICK_H} />
					<text class="tick-label" x={tick.x} y={TICK_TOP - 2} text-anchor="middle">
						{tick.label}
					</text>
					<text class="tick-sublabel" x={tick.x} y={HEIGHT - 4} text-anchor="middle">
						{tick.sublabel}
					</text>
				{/each}

				{#if linearMarkerX !== null}
					<g class="marker linear" transform="translate({linearMarkerX}, 0)">
						<line class="marker-line" x1="0" y1={TICK_TOP} x2="0" y2={TICK_TOP + TICK_H + 4} />
						<circle class="marker-cap" cx="0" cy={TICK_TOP} r="4" />
						<title>Linear {formatLocalTime($linearNow, $location.timezone)}</title>
					</g>
				{/if}
			{/if}
		</svg>
	</div>

	<div class="timeline-row">
		<span class="row-label" id="timeline-solar-label">Solar</span>
		<svg
			class="timeline-svg"
			viewBox="0 0 {WIDTH} {HEIGHT}"
			width="100%"
			height={HEIGHT}
			role="img"
			aria-labelledby="timeline-solar-label"
			aria-label="Solar time timeline with sunrise at 6:00, noon at 12:00, and sunset at 18:00"
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
				{#each solarSegments as seg (seg.kind + seg.x)}
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

				{#each solarTicksList as tick (tick.sublabel)}
					<line class="tick" x1={tick.x} y1={TICK_TOP} x2={tick.x} y2={TICK_TOP + TICK_H} />
					<text class="tick-label" x={tick.x} y={TICK_TOP - 2} text-anchor="middle">
						{tick.label}
					</text>
					<text class="tick-sublabel" x={tick.x} y={HEIGHT - 4} text-anchor="middle">
						{tick.sublabel}
					</text>
				{/each}

				{#if solarMarkerX !== null}
					<g class="marker solar" transform="translate({solarMarkerX}, 0)">
						<line class="marker-line" x1="0" y1={TICK_TOP} x2="0" y2={TICK_TOP + TICK_H + 4} />
						<circle class="marker-cap" cx="0" cy={TICK_TOP} r="4" />
						<title>Solar {formatSolarTime($solarNow!)}</title>
					</g>
				{/if}
			{/if}
		</svg>
	</div>
</div>

<style>
	.timeline-strip {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		width: 100%;
	}

	.timeline-row {
		display: grid;
		grid-template-columns: 3.25rem 1fr;
		align-items: center;
		gap: 0.5rem;
	}

	.row-label {
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-muted);
		text-align: right;
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
</style>
