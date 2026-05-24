<script lang="ts">
	import {
		computeYearlyDrift,
		DEFAULT_WORKDAY_END,
		DEFAULT_WORKDAY_START,
		doyToMonthDay,
		formatDaytimeOverlapLabel,
		formatDoyLabel,
		formatNighttimeOverlapLabel,
		formatSolarHours,
		workdaySolarOverlapFractions,
		yearlyDriftUplotData,
		type YearlyDriftSeries
	} from '$lib/yearlyDrift.js';
	import { location } from '$lib/stores/location.js';
	import { onMount, untrack } from 'svelte';
	import uPlot from 'uplot';
	import 'uplot/dist/uPlot.min.css';

	const CHART_HEIGHT = 300;
	const MONTH_NAMES = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec'
	] as const;

	interface ChartColors {
		fg: string;
		grid: string;
		bg: string;
		linear: string;
		solar: string;
	}

	let chartEl: HTMLDivElement | undefined = $state();
	/** Non-reactive: uPlot instance must not retrigger $effect when assigned. */
	let plot: uPlot | undefined;
	let series: YearlyDriftSeries | null = null;

	let tooltipVisible = $state(false);
	let tooltipDate = $state('');
	let tooltipStartSolar = $state('');
	let tooltipEndSolar = $state('');
	let tooltipDaytime = $state('');
	let tooltipNighttime = $state('');
	let tooltipLeft = $state(0);
	let tooltipTop = $state(0);

	let workdayStart = $state(DEFAULT_WORKDAY_START);
	let workdayEnd = $state(DEFAULT_WORKDAY_END);

	/** Non-reactive: read by uPlot hooks only; must not retrigger $effect when updated. */
	const chartState: { colors: ChartColors; year: number } = {
		colors: {
			fg: '#1a1a1a',
			grid: '#d4d0c8',
			bg: '#f8f6f1',
			linear: '#3b82f6',
			solar: '#f97316'
		},
		year: new Date().getFullYear()
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

	function parseTimeInput(value: string): number {
		const [h, m] = value.split(':').map(Number);
		return h + (m || 0) / 60;
	}

	function formatTimeInput(decimalHours: number): string {
		const h = Math.floor(decimalHours);
		const m = Math.round((decimalHours - h) * 60);
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}

	function monthAxisValues(_u: uPlot, splits: number[]): string[] {
		const y = chartState.year;
		return splits.map((doy) => {
			const { month, day } = doyToMonthDay(y, Math.round(doy));
			return day === 1 ? MONTH_NAMES[month - 1] : '';
		});
	}

	function updateTooltip(u: uPlot): void {
		const idx = u.cursor.idx;
		if (idx == null || idx < 0) {
			tooltipVisible = false;
			return;
		}
		const doy = u.data[0][idx];
		const start = u.data[1][idx];
		const end = u.data[2][idx];
		if (doy == null) {
			tooltipVisible = false;
			return;
		}
		tooltipDate = formatDoyLabel(chartState.year, doy);
		tooltipStartSolar = start == null || !Number.isFinite(start) ? '—' : formatSolarHours(start);
		tooltipEndSolar = end == null || !Number.isFinite(end) ? '—' : formatSolarHours(end);
		if (start != null && end != null && Number.isFinite(start) && Number.isFinite(end)) {
			const overlap = workdaySolarOverlapFractions(start, end);
			tooltipDaytime = formatDaytimeOverlapLabel(overlap.daytimeFraction);
			tooltipNighttime = overlap.hasNightOverlap
				? formatNighttimeOverlapLabel(overlap.nighttimeFraction)
				: '';
		} else {
			tooltipDaytime = '';
			tooltipNighttime = '';
		}
		tooltipVisible = true;
		const { left, top } = u.cursor;
		if (left == null || top == null) return;
		const root = u.root.getBoundingClientRect();
		const host = chartEl?.getBoundingClientRect();
		if (!host) return;
		tooltipLeft = left + root.left - host.left + 12;
		tooltipTop = top + root.top - host.top - 8;
	}

	function buildOptions(width: number): uPlot.Options {
		const { colors } = chartState;
		return {
			width,
			height: CHART_HEIGHT,
			padding: [16, 16, 8, 0],
			legend: { show: false },
			cursor: {
				show: true,
				x: true,
				y: false,
				points: { show: true, size: 5 },
				drag: { setScale: false }
			},
			hooks: {
				setCursor: [updateTooltip]
			},
			scales: {
				x: { min: 1, max: series?.dayOfYear.length ?? 365 },
				y: { min: 0, max: 24 }
			},
			axes: [
				{
					scale: 'x',
					stroke: colors.fg,
					grid: { stroke: colors.grid },
					ticks: { stroke: colors.grid },
					values: monthAxisValues
				},
				{
					scale: 'y',
					stroke: colors.fg,
					grid: { stroke: colors.grid },
					ticks: { stroke: colors.grid },
					values: (_u, splits) => splits.map((v) => String(Math.round(v)))
				}
			],
			series: [
				{ label: 'Day' },
				{
					label: 'Workday start',
					stroke: colors.linear,
					width: 2,
					points: { show: false }
				},
				{
					label: 'Workday end',
					stroke: colors.linear,
					width: 2,
					dash: [4, 4],
					points: { show: false }
				},
				{
					label: 'Solar morning',
					stroke: colors.solar,
					width: 1,
					dash: [6, 4],
					alpha: 0.45,
					points: { show: false }
				},
				{
					label: 'Solar evening',
					stroke: colors.solar,
					width: 1,
					dash: [6, 4],
					alpha: 0.45,
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
		u.series[1].stroke = colors.linear;
		u.series[2].stroke = colors.linear;
		u.series[3].stroke = colors.solar;
		u.series[4].stroke = colors.solar;
	}

	function refreshChart(): void {
		if (!chartEl) return;

		const loc = $location;
		chartState.year = new Date().getFullYear();
		series = computeYearlyDrift(loc, {
			year: chartState.year,
			workdayStart,
			workdayEnd
		});

		const data = yearlyDriftUplotData(series);
		const width = Math.max(chartEl.clientWidth, 280);

		if (plot) {
			plot.setData(data, false);
			plot.setScale('x', { min: 1, max: series.dayOfYear.length });
		} else {
			chartState.colors = readColors(chartEl);
			plot = new uPlot(buildOptions(width), data, chartEl);
		}
	}

	$effect(() => {
		void $location;
		void workdayStart;
		void workdayEnd;
		void chartEl;
		untrack(() => refreshChart());
	});

	onMount(() => {
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

		let chartWidth = 0;
		const resizeObserver =
			typeof ResizeObserver !== 'undefined' && chartEl
				? new ResizeObserver(() => {
						if (!plot || !chartEl) return;
						const w = chartEl.clientWidth;
						if (w > 0 && w !== chartWidth) {
							chartWidth = w;
							plot.setSize({ width: w, height: CHART_HEIGHT });
						}
					})
				: null;
		if (chartEl) resizeObserver?.observe(chartEl);

		return () => {
			themeObserver.disconnect();
			resizeObserver?.disconnect();
			plot?.destroy();
			plot = undefined;
		};
	});
</script>

<div class="yearly-drift">
	<div class="yearly-drift-controls">
		<label class="control">
			<span class="control-label">Workday start</span>
			<input
				type="time"
				value={formatTimeInput(workdayStart)}
				onchange={(e) => (workdayStart = parseTimeInput(e.currentTarget.value))}
			/>
		</label>
		<label class="control">
			<span class="control-label">Workday end</span>
			<input
				type="time"
				value={formatTimeInput(workdayEnd)}
				onchange={(e) => (workdayEnd = parseTimeInput(e.currentTarget.value))}
			/>
		</label>
	</div>

	<div class="yearly-drift-chart-wrap">
		<div
			class="yearly-drift-chart"
			bind:this={chartEl}
			role="img"
			aria-label="Yearly solar drift for workday start and end"
		></div>
		{#if tooltipVisible}
			<div class="yearly-drift-tooltip" style:left="{tooltipLeft}px" style:top="{tooltipTop}px">
				<strong>{tooltipDate}</strong><br />
				Start {formatTimeInput(workdayStart)} → solar {tooltipStartSolar}<br />
				End {formatTimeInput(workdayEnd)} → solar {tooltipEndSolar}
				{#if tooltipDaytime}
					<br />{tooltipDaytime}
				{/if}
				{#if tooltipNighttime}
					<br />{tooltipNighttime}
				{/if}
			</div>
		{/if}
	</div>

	<p class="yearly-drift-caption">
		Linear work hours mapped to solar time through the year. Dashed lines: solar 06:00 and 18:00.
	</p>
</div>

<style>
	.yearly-drift {
		width: 100%;
	}

	.yearly-drift-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem 1.5rem;
		margin-bottom: 0.75rem;
	}

	.control {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.8rem;
	}

	.control-label {
		opacity: 0.7;
	}

	.control input {
		font: inherit;
		padding: 0.25rem 0.4rem;
		border: 1px solid var(--color-grid);
		border-radius: 0.25rem;
		background: var(--color-bg);
		color: var(--color-fg);
	}

	.yearly-drift-chart-wrap {
		position: relative;
		width: 100%;
	}

	.yearly-drift-chart {
		width: 100%;
		min-height: 300px;
	}

	.yearly-drift-chart :global(.uplot) {
		font-family: inherit;
	}

	.yearly-drift-tooltip {
		position: absolute;
		pointer-events: none;
		z-index: 2;
		padding: 0.35rem 0.5rem;
		font-size: 0.75rem;
		line-height: 1.4;
		border-radius: 0.25rem;
		background: color-mix(in srgb, var(--color-bg) 92%, var(--color-fg));
		border: 1px solid var(--color-grid);
		box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
		white-space: nowrap;
		transform: translateY(-100%);
	}

	.yearly-drift-caption {
		margin: 0.35rem 0 0;
		font-size: 0.7rem;
		opacity: 0.55;
	}
</style>
