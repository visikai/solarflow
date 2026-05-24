<script lang="ts">
	import {
		sampleSunArc,
		sunArcPathAboveHorizon,
		sunSampleToDiagram,
		type SunArcDiagramLayout
	} from '$lib/sky.js';
	import { location } from '$lib/stores/location.js';
	import { sunEvents } from '$lib/stores/sunEvents.js';
	import { linearNow } from '$lib/stores/time.js';
	import SunCalc from 'suncalc';

	const WIDTH = 560;
	const HEIGHT = 220;
	const HORIZON_Y = 168;
	const ARC_HEIGHT = 130;
	const PAD_X = 28;
	const GROUND_H = HEIGHT - HORIZON_Y;

	const layout: SunArcDiagramLayout = {
		width: WIDTH,
		height: HEIGHT,
		horizonY: HORIZON_Y,
		arcHeight: ARC_HEIGHT,
		horizontalPadding: PAD_X
	};

	let events = $derived($sunEvents);
	let polar = $derived(events.polar);
	let arcSamples = $derived(sampleSunArc($location, events.date, 48));
	let arcPath = $derived(sunArcPathAboveHorizon(arcSamples, layout));

	let currentPos = $derived(
		SunCalc.getPosition($linearNow, $location.latitude, $location.longitude)
	);
	let currentAltDeg = $derived((currentPos.altitude * 180) / Math.PI);
	let sunUp = $derived(currentPos.altitude >= 0);

	let skyBlend = $derived.by(() => {
		if (!sunUp) return 0;
		return Math.min(1, Math.max(0, currentPos.altitude / (Math.PI / 2)));
	});

	let sunDot = $derived(
		sunSampleToDiagram({ altitude: currentPos.altitude, azimuth: currentPos.azimuth }, layout)
	);

	function formatLocalTime(instant: Date, timeZone: string): string {
		return new Intl.DateTimeFormat(undefined, {
			timeZone,
			hour: 'numeric',
			minute: '2-digit'
		}).format(instant);
	}

	let eventLabels = $derived.by(() => {
		if (polar !== null) return [];
		return [
			{ instant: events.sunrise, sub: 'sunrise' },
			{ instant: events.solarNoon, sub: 'noon' },
			{ instant: events.sunset, sub: 'sunset' }
		]
			.map(({ instant, sub }) => {
				if (Number.isNaN(instant.getTime())) return null;
				const pos = SunCalc.getPosition(instant, $location.latitude, $location.longitude);
				const { x, y } = sunSampleToDiagram(
					{ altitude: pos.altitude, azimuth: pos.azimuth },
					layout
				);
				return {
					x,
					y: y - 10,
					text: formatLocalTime(instant, $location.timezone),
					sub
				};
			})
			.filter((l): l is NonNullable<typeof l> => l !== null);
	});
</script>

<div
	class="sun-arc"
	class:night={!sunUp}
	style="--sky-blend: {skyBlend}; --sky-alt: {currentAltDeg.toFixed(1)}deg"
>
	<svg
		class="sun-arc-svg"
		viewBox="0 0 {WIDTH} {HEIGHT}"
		width="100%"
		height={HEIGHT}
		role="img"
		aria-label="Sun path across the sky today"
	>
		<defs>
			<linearGradient id="sun-arc-sky" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="var(--sun-arc-sky-top)" />
				<stop offset="100%" stop-color="var(--sun-arc-sky-bottom)" />
			</linearGradient>
		</defs>

		<rect class="sky" x="0" y="0" width={WIDTH} height={HORIZON_Y} fill="url(#sun-arc-sky)" />
		<rect class="ground" x="0" y={HORIZON_Y} width={WIDTH} height={GROUND_H} />

		{#if polar === 'night'}
			<text class="polar-msg" x={WIDTH / 2} y={HORIZON_Y - 36} text-anchor="middle">
				Polar night
			</text>
			<text class="polar-sub" x={WIDTH / 2} y={HORIZON_Y - 18} text-anchor="middle">
				Sun below the horizon all day
			</text>
		{:else if polar === 'day'}
			<text class="polar-msg" x={WIDTH / 2} y={28} text-anchor="middle">Polar day</text>
			{#if arcPath}
				<path class="arc" d={arcPath} fill="none" />
			{/if}
		{:else if arcPath}
			<path class="arc" d={arcPath} fill="none" />
		{/if}

		<line class="horizon" x1={PAD_X} y1={HORIZON_Y} x2={WIDTH - PAD_X} y2={HORIZON_Y} />

		<text class="compass east" x={PAD_X} y={HORIZON_Y + 16} text-anchor="start">E</text>
		<text class="compass west" x={WIDTH - PAD_X} y={HORIZON_Y + 16} text-anchor="end">W</text>

		{#if polar === null}
			{#each eventLabels as label (label.sub)}
				<g class="arc-label">
					<text x={label.x} y={label.y} text-anchor="middle">{label.text}</text>
					<text class="arc-label-sub" x={label.x} y={label.y + 12} text-anchor="middle">
						{label.sub}
					</text>
				</g>
			{/each}
		{/if}

		<circle
			class="sun-dot"
			class:below-horizon={!sunUp}
			cx={sunDot.x}
			cy={sunDot.y}
			r={sunUp ? 7 : 5}
		>
			<title>
				{sunUp ? 'Sun above horizon' : 'Sun below horizon'} ({currentAltDeg.toFixed(1)}°)
			</title>
		</circle>
	</svg>
</div>

<style>
	.sun-arc {
		--sun-arc-sky-top: color-mix(
			in srgb,
			var(--color-day) calc(var(--sky-blend) * 55%),
			var(--color-night)
		);
		--sun-arc-sky-bottom: color-mix(
			in srgb,
			var(--color-day) calc(var(--sky-blend) * 25%),
			var(--color-night)
		);
		width: 100%;
	}

	.sun-arc.night {
		--sun-arc-sky-top: color-mix(in srgb, var(--color-night) 92%, var(--color-fg));
		--sun-arc-sky-bottom: color-mix(in srgb, var(--color-night) 98%, var(--color-bg));
	}

	.sun-arc-svg {
		display: block;
		max-width: 100%;
	}

	.ground {
		fill: color-mix(in srgb, var(--color-grid) 40%, var(--color-bg));
	}

	.horizon {
		stroke: var(--color-fg);
		stroke-width: 1.5;
		opacity: 0.5;
	}

	.arc {
		stroke: var(--color-accent-solar);
		stroke-width: 2.5;
		opacity: 0.85;
	}

	.sun-dot {
		fill: var(--color-accent-solar);
		stroke: var(--color-bg);
		stroke-width: 2;
	}

	.sun-dot.below-horizon {
		fill: var(--color-night);
		opacity: 0.75;
	}

	.compass {
		fill: var(--color-fg);
		font-size: 11px;
		font-weight: 600;
		opacity: 0.45;
		font-family: inherit;
	}

	.arc-label text {
		fill: var(--color-fg);
		font-size: 11px;
		font-family: inherit;
	}

	.arc-label-sub {
		fill: var(--color-accent-solar);
		font-size: 9px;
		opacity: 0.75;
		text-transform: lowercase;
	}

	.polar-msg,
	.polar-sub {
		fill: var(--color-fg);
		font-family: inherit;
	}

	.polar-msg {
		font-size: 14px;
		font-weight: 600;
	}

	.polar-sub {
		font-size: 11px;
		opacity: 0.65;
	}
</style>
