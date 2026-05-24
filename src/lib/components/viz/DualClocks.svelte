<script lang="ts">
	import {
		formatLinearDigital,
		formatSolarDigital,
		handTip,
		linearHandAngles,
		solarHandAngles
	} from '$lib/clockHands.js';
	import { location } from '$lib/stores/location.js';
	import { sunEvents } from '$lib/stores/sunEvents.js';
	import { linearNow, solarNow } from '$lib/stores/time.js';

	const SIZE = 200;
	const CX = SIZE / 2;
	const CY = SIZE / 2;
	const R = 88;
	const TICK_INNER = R - 8;
	const TICK_OUTER = R;

	let events = $derived($sunEvents);
	let polar = $derived(events.polar);

	let linearAngles = $derived(linearHandAngles($linearNow, $location.timezone));
	let solarAngles = $derived($solarNow === null ? null : solarHandAngles($solarNow));

	let linearDigital = $derived(formatLinearDigital($linearNow, $location.timezone));
	let solarDigital = $derived($solarNow === null ? '' : formatSolarDigital($solarNow));

	const HOUR_TICKS = Array.from({ length: 12 }, (_, i) => i);

	function tickLine(i: number): { x1: number; y1: number; x2: number; y2: number } {
		const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
		return {
			x1: CX + TICK_INNER * Math.cos(angle),
			y1: CY + TICK_INNER * Math.sin(angle),
			x2: CX + TICK_OUTER * Math.cos(angle),
			y2: CY + TICK_OUTER * Math.sin(angle)
		};
	}

	function handLine(degreesFrom12: number, length: number): { x2: number; y2: number } {
		const tip = handTip(CX, CY, length, degreesFrom12);
		return { x2: tip.x, y2: tip.y };
	}

	function handLines(angles: { hour: number; minute: number; second: number }) {
		return {
			hour: handLine(angles.hour, R * 0.48),
			minute: handLine(angles.minute, R * 0.68),
			second: handLine(angles.second, R * 0.82)
		};
	}

	let linearHands = $derived(handLines(linearAngles));
	let solarHands = $derived(solarAngles ? handLines(solarAngles) : null);

	function labelPos(solarHour: number): { x: number; y: number; anchor: string } {
		const hourOnDial = solarHour % 12;
		const angle = (hourOnDial / 12) * Math.PI * 2 - Math.PI / 2;
		const dist = R - 22;
		const x = CX + dist * Math.cos(angle);
		const y = CY + dist * Math.sin(angle);
		let anchor = 'middle';
		if (solarHour === 6) anchor = 'end';
		if (solarHour === 18) anchor = 'start';
		return { x, y, anchor };
	}

	const solarLabels = [
		{ hour: 6, text: 'sunrise' },
		{ hour: 12, text: 'noon' },
		{ hour: 18, text: 'sunset' }
	] as const;
</script>

<div class="dual-clocks">
	<div class="clock-panel">
		<p class="clock-title">Linear</p>
		<svg
			class="clock-svg"
			viewBox="0 0 {SIZE} {SIZE}"
			width={SIZE}
			height={SIZE}
			role="img"
			aria-label="Linear clock"
		>
			<circle class="face" cx={CX} cy={CY} r={R} />
			{#each HOUR_TICKS as i (i)}
				{@const t = tickLine(i)}
				<line class="tick" x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
			{/each}
			<g class="hands">
				<line class="hand hour" x1={CX} y1={CY} x2={linearHands.hour.x2} y2={linearHands.hour.y2} />
				<line
					class="hand minute"
					x1={CX}
					y1={CY}
					x2={linearHands.minute.x2}
					y2={linearHands.minute.y2}
				/>
				<line
					class="hand second"
					x1={CX}
					y1={CY}
					x2={linearHands.second.x2}
					y2={linearHands.second.y2}
				/>
			</g>
			<circle class="hub" cx={CX} cy={CY} r="4" />
		</svg>
		<p class="digital linear">{linearDigital}</p>
	</div>

	<div class="clock-panel">
		<p class="clock-title">Solar</p>
		<svg
			class="clock-svg"
			viewBox="0 0 {SIZE} {SIZE}"
			width={SIZE}
			height={SIZE}
			role="img"
			aria-label="Solar clock"
		>
			<circle class="face" cx={CX} cy={CY} r={R} />
			{#if polar !== null || $solarNow === null}
				<circle class="polar-ring" cx={CX} cy={CY} r={R - 12} />
				<text class="polar-label" x={CX} y={CY - 6} text-anchor="middle">
					{polar === 'day' ? 'Polar day' : 'Polar night'}
				</text>
				<text class="polar-sublabel" x={CX} y={CY + 14} text-anchor="middle">
					solar time undefined
				</text>
			{:else}
				{#each HOUR_TICKS as i (i)}
					{@const t = tickLine(i)}
					<line class="tick" x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
				{/each}
				{#each solarLabels as label (label.hour)}
					{@const pos = labelPos(label.hour)}
					<text
						class="solar-label"
						x={pos.x}
						y={pos.y}
						text-anchor={pos.anchor}
						dominant-baseline="middle"
					>
						{label.text}
					</text>
				{/each}
				{#if solarHands}
					<g class="hands">
						<line
							class="hand hour"
							x1={CX}
							y1={CY}
							x2={solarHands.hour.x2}
							y2={solarHands.hour.y2}
						/>
						<line
							class="hand minute"
							x1={CX}
							y1={CY}
							x2={solarHands.minute.x2}
							y2={solarHands.minute.y2}
						/>
						<line
							class="hand second"
							x1={CX}
							y1={CY}
							x2={solarHands.second.x2}
							y2={solarHands.second.y2}
						/>
					</g>
				{/if}
				<circle class="hub" cx={CX} cy={CY} r="4" />
			{/if}
		</svg>
		<p class="digital solar">{solarDigital || '— — —'}</p>
	</div>
</div>

<style>
	.dual-clocks {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 2rem;
		padding: 1rem;
	}

	.clock-panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.clock-title {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		opacity: 0.75;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.clock-svg {
		display: block;
	}

	.face {
		fill: var(--color-bg);
		stroke: var(--color-grid);
		stroke-width: 2;
	}

	.tick {
		stroke: var(--color-fg);
		stroke-width: 1.5;
		opacity: 0.35;
	}

	.hand {
		stroke-linecap: round;
	}

	.hand.hour {
		stroke-width: 4;
	}

	.hand.minute {
		stroke-width: 3;
	}

	.hand.second {
		stroke-width: 1.5;
	}

	.hub {
		fill: var(--color-fg);
	}

	.digital {
		margin: 0;
		font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace;
		font-size: 1.125rem;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.04em;
	}

	.digital.linear {
		color: var(--color-accent-linear);
	}

	.digital.solar {
		color: var(--color-accent-solar);
	}

	.clock-panel:first-child .hand {
		stroke: var(--color-accent-linear);
	}

	.clock-panel:last-child .hand {
		stroke: var(--color-accent-solar);
	}

	.solar-label {
		fill: var(--color-accent-solar);
		font-size: 9px;
		font-family: inherit;
		opacity: 0.7;
		text-transform: lowercase;
	}

	.polar-ring {
		fill: none;
		stroke: var(--color-night);
		stroke-width: 3;
		opacity: 0.35;
	}

	.polar-label,
	.polar-sublabel {
		fill: var(--color-fg);
		font-family: inherit;
	}

	.polar-label {
		font-size: 13px;
		font-weight: 600;
	}

	.polar-sublabel {
		font-size: 11px;
		opacity: 0.65;
	}
</style>
