<script lang="ts">
	import {
		HOUR_TICKS,
		localDecimalHours,
		mappingCurveUplotData,
		sampleMappingCurve,
		type MappingCurveGuides
	} from '$lib/mappingCurve.js';
	import { computeSunEvents } from '$lib/sun.js';
	import { location } from '$lib/stores/location.js';
	import { linearNow, solarNow } from '$lib/stores/time.js';
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';
	import uPlot from 'uplot';
	import 'uplot/dist/uPlot.min.css';

	const CHART_SIZE = 320;

	interface ChartColors {
		fg: string;
		grid: string;
		bg: string;
		linear: string;
		solar: string;
	}

	interface ChartState {
		guides: MappingCurveGuides | null;
		solarY: number | null;
		colors: ChartColors;
	}

	let rootEl: HTMLDivElement | undefined = $state();
	let chartEl: HTMLDivElement | undefined = $state();
	let plot: uPlot | undefined = $state();
	let polar = $state<'day' | 'night' | null>(null);
	let chartState: ChartState = {
		guides: null,
		solarY: null,
		colors: {
			fg: '#1a1a1a',
			grid: '#d4d0c8',
			bg: '#f8f6f1',
			linear: '#3b82f6',
			solar: '#f97316'
		}
	};

	function readColors(el: HTMLElement): ChartColors {
		const style = getComputedStyle(el);
		return {
			fg: style.getPropertyValue('--color-fg').trim() || '#1a1a1a',
			grid: style.getPropertyValue('--color-grid').trim() || '#d4d0c8',
			bg: style.getPropertyValue('--color-bg').trim() || '#f8f6f1',
			linear: style.getPropertyValue('--color-accent-linear').trim() || '#3b82f6',
			solar: style.getPropertyValue('--color-accent-solar').trim() || '#f97316'
		};
	}

	function drawGuideLine(
		u: uPlot,
		ctx: CanvasRenderingContext2D,
		color: string,
		x0: number,
		y0: number,
		x1: number,
		y1: number
	): void {
		ctx.save();
		ctx.strokeStyle = color;
		ctx.globalAlpha = 0.35;
		ctx.lineWidth = 1;
		ctx.setLineDash([4, 4]);
		ctx.beginPath();
		ctx.moveTo(x0, y0);
		ctx.lineTo(x1, y1);
		ctx.stroke();
		ctx.restore();
	}

	function drawGuidesAndSolarNow(u: uPlot): void {
		const { guides, solarY, colors } = chartState;
		const { left, top, width, height } = u.bbox;
		const ctx = u.ctx;

		if (guides) {
			const xSunrise = u.valToPos(guides.sunriseX, 'x', true);
			const xSunset = u.valToPos(guides.sunsetX, 'x', true);
			const yMorning = u.valToPos(guides.solarMorningY, 'y', true);
			const yEvening = u.valToPos(guides.solarEveningY, 'y', true);
			drawGuideLine(u, ctx, colors.solar, xSunrise, top, xSunrise, top + height);
			drawGuideLine(u, ctx, colors.solar, xSunset, top, xSunset, top + height);
			drawGuideLine(u, ctx, colors.solar, left, yMorning, left + width, yMorning);
			drawGuideLine(u, ctx, colors.solar, left, yEvening, left + width, yEvening);
		}

		if (solarY !== null) {
			const y = u.valToPos(solarY, 'y', true);
			ctx.save();
			ctx.strokeStyle = colors.solar;
			ctx.globalAlpha = 0.9;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(left, y);
			ctx.lineTo(left + width, y);
			ctx.stroke();
			ctx.restore();
		}
	}

	function buildOptions(): uPlot.Options {
		const { colors } = chartState;
		return {
			width: CHART_SIZE,
			height: CHART_SIZE,
			padding: [12, 12, 4, 4],
			legend: { show: false },
			cursor: {
				show: true,
				x: true,
				y: false,
				points: { show: false },
				drag: { setScale: false }
			},
			hooks: {
				draw: [drawGuidesAndSolarNow]
			},
			scales: {
				x: { min: 0, max: 24 },
				y: { min: 0, max: 24 }
			},
			axes: [
				{
					scale: 'x',
					stroke: colors.fg,
					grid: { stroke: colors.grid },
					ticks: { stroke: colors.grid },
					values: () => [...HOUR_TICKS]
				},
				{
					scale: 'y',
					stroke: colors.fg,
					grid: { stroke: colors.grid },
					ticks: { stroke: colors.grid },
					values: () => [...HOUR_TICKS]
				}
			],
			series: [
				{ label: 'Linear' },
				{
					label: 'Solar',
					stroke: colors.solar,
					width: 2.5,
					points: { show: false }
				},
				{
					label: 'Equinox reference',
					stroke: colors.fg,
					width: 1,
					dash: [6, 6],
					alpha: 0.28,
					points: { show: false }
				}
			]
		};
	}

	function applyColors(u: uPlot): void {
		chartState.colors = readColors(u.root);
		const { colors } = chartState;
		u.axes[0].stroke = colors.fg;
		u.axes[0].grid!.stroke = colors.grid;
		u.axes[0].ticks!.stroke = colors.grid;
		u.axes[1].stroke = colors.fg;
		u.axes[1].grid!.stroke = colors.grid;
		u.axes[1].ticks!.stroke = colors.grid;
		u.series[1].stroke = colors.solar;
		u.series[2].stroke = colors.fg;
	}

	function refreshSeriesForLocation(): void {
		const loc = $location;
		const now = get(linearNow);
		const events = computeSunEvents(loc, now);
		if (events.polar !== null) {
			polar = events.polar;
			chartState.guides = null;
			plot?.destroy();
			plot = undefined;
			return;
		}

		const sampled = sampleMappingCurve(loc, now, events);
		if (!sampled || !chartEl) return;
		polar = null;
		chartState.guides = sampled.guides;
		const data = mappingCurveUplotData(sampled);
		if (plot) {
			plot.setData(data, false);
		} else if (chartEl) {
			chartState.colors = readColors(chartEl);
			plot = new uPlot(buildOptions(), data, chartEl);
			syncCursor();
		}
	}

	function syncCursor(): void {
		if (!plot) return;
		const loc = get(location);
		const now = get(linearNow);
		const solar = get(solarNow);
		chartState.solarY = solar;
		const linearH = localDecimalHours(now, loc.timezone);
		plot.setCursor(
			{
				left: plot.valToPos(linearH, 'x'),
				top: plot.bbox.top
			},
			true
		);
	}

	$effect(() => {
		void $location;
		void chartEl;
		refreshSeriesForLocation();
	});

	onMount(() => {
		refreshSeriesForLocation();

		const unsubNow = linearNow.subscribe(() => {
			syncCursor();
		});

		const themeObserver = new MutationObserver(() => {
			if (plot) {
				applyColors(plot);
				plot.redraw();
			}
		});
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class', 'data-theme', 'style']
		});

		const resizeObserver =
			typeof ResizeObserver !== 'undefined' && chartEl
				? new ResizeObserver(() => {
						if (!plot || !chartEl) return;
						const size = Math.min(chartEl.clientWidth, CHART_SIZE);
						if (size > 0) plot.setSize({ width: size, height: size });
					})
				: null;
		if (chartEl) resizeObserver?.observe(chartEl);

		return () => {
			unsubNow();
			themeObserver.disconnect();
			resizeObserver?.disconnect();
			plot?.destroy();
			plot = undefined;
		};
	});
</script>

<div class="mapping-curve" bind:this={rootEl}>
	{#if polar !== null}
		<p class="polar-msg">
			{polar === 'day' ? 'Polar day' : 'Polar night'} — mapping curve unavailable
		</p>
	{:else}
		<div
			class="mapping-curve-chart"
			bind:this={chartEl}
			role="img"
			aria-label="Linear to solar time mapping for today"
		></div>
		<p class="mapping-curve-caption">Equinox reference (y = x)</p>
	{/if}
</div>

<style>
	.mapping-curve {
		width: 100%;
		max-width: 22rem;
	}

	.mapping-curve-chart {
		aspect-ratio: 1;
		width: 100%;
		max-width: 20rem;
	}

	.mapping-curve-chart :global(.uplot) {
		font-family: inherit;
	}

	.mapping-curve-caption {
		margin: 0.35rem 0 0;
		font-size: 0.7rem;
		opacity: 0.55;
	}

	.polar-msg {
		margin: 0;
		font-size: 0.875rem;
		opacity: 0.75;
	}
</style>
