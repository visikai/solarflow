<script lang="ts">
	import { formatYearlyTooltipDaySection } from '$lib/dayLength.js';
	import { formatTimeInput, parseTimeInput } from '$lib/timeInput.js';
	import {
		computeYearlyDrift,
		currentDayOfYear,
		DEFAULT_WORKDAY_END,
		DEFAULT_WORKDAY_START,
		doyToMonthDay,
		formatDoyLabel,
		formatSolarHours,
		formatWorkhoursOverlapLabel,
		locationObservesDst,
		monthStartDaysOfYear,
		SOLAR_EVENING_REF,
		SOLAR_MORNING_REF,
		sunEventsForDayOfYear,
		workdaySolarOverlapFractions,
		yearlyDriftUplotData,
		yearlyDriftYRange,
		type YearlyDriftSeries
	} from '$lib/yearlyDrift.js';
	import { location } from '$lib/stores/location.js';
	import { get } from 'svelte/store';
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
		clock: string;
		solar: string;
		fillDaytime: string;
		fillWorkhours: string;
	}

	let chartEl: HTMLDivElement | undefined = $state();
	/** Non-reactive: uPlot instance must not retrigger $effect when assigned. */
	let plot: uPlot | undefined;
	let series: YearlyDriftSeries | null = null;

	let tooltipVisible = $state(false);
	let tooltipDate = $state('');
	let tooltipPolarNote = $state<string | null>(null);
	let tooltipSunTimesLine = $state<string | null>(null);
	let tooltipDayNightLine = $state('');
	let tooltipStartSolar = $state('');
	let tooltipEndSolar = $state('');
	let tooltipOverlap = $state('');
	let tooltipLeft = $state(0);
	let tooltipTop = $state(0);

	let workdayStart = $state(DEFAULT_WORKDAY_START);
	let workdayEnd = $state(DEFAULT_WORKDAY_END);

	let observesDst = $state(false);

	/** Non-reactive: read by uPlot hooks only; must not retrigger $effect when updated. */
	const chartState: {
		colors: ChartColors;
		year: number;
		currentDoy: number | null;
	} = {
		colors: {
			fg: '#1a1a1a',
			grid: '#d4d0c8',
			bg: '#f8f6f1',
			clock: '#2563eb',
			solar: '#c2410c',
			fillDaytime: 'rgba(194, 65, 12, 0.14)',
			fillWorkhours: 'rgba(37, 99, 235, 0.12)'
		},
		year: new Date().getFullYear(),
		currentDoy: null
	};

	function colorSource(): HTMLElement {
		return chartEl ?? document.documentElement;
	}

	function colorWithAlpha(color: string, alpha: number): string {
		const c = color.trim();
		if (c.startsWith('#')) {
			const hex = c.slice(1);
			const r = Number.parseInt(hex.slice(0, 2), 16);
			const g = Number.parseInt(hex.slice(2, 4), 16);
			const b = Number.parseInt(hex.slice(4, 6), 16);
			return `rgba(${r}, ${g}, ${b}, ${alpha})`;
		}
		return c;
	}

	function readColors(el: HTMLElement = colorSource()): ChartColors {
		const style = getComputedStyle(el);
		const clock = style.getPropertyValue('--color-accent-clock').trim() || '#2563eb';
		const solar = style.getPropertyValue('--color-accent-solar').trim() || '#c2410c';
		return {
			fg: style.getPropertyValue('--color-fg').trim() || '#1a1a1a',
			grid: style.getPropertyValue('--color-grid').trim() || '#d4d0c8',
			bg: style.getPropertyValue('--color-bg').trim() || '#f8f6f1',
			clock,
			solar,
			fillDaytime: colorWithAlpha(solar, 0.14),
			fillWorkhours: colorWithAlpha(clock, 0.12)
		};
	}

	function monthAxisSplits(): number[] {
		return monthStartDaysOfYear(chartState.year);
	}

	function monthAxisValues(_u: uPlot, splits: number[]): string[] {
		const y = chartState.year;
		return splits.map((doy) => {
			const { month } = doyToMonthDay(y, Math.round(doy));
			return MONTH_NAMES[month - 1];
		});
	}

	function drawLineLabel(
		ctx: CanvasRenderingContext2D,
		text: string,
		x: number,
		y: number,
		align: CanvasTextAlign,
		colors: ChartColors,
		ink: string = colors.solar
	): void {
		const padX = 5;
		const padY = 3;
		const font = '600 11px system-ui, sans-serif';
		ctx.font = font;
		const w = ctx.measureText(text).width + padX * 2;
		const h = 14 + padY;
		const bx = align === 'center' ? x - w / 2 : align === 'left' ? x : x - w;
		const by = y - h / 2;

		ctx.fillStyle = colors.bg;
		ctx.globalAlpha = 0.92;
		ctx.beginPath();
		ctx.roundRect(bx, by, w, h, 3);
		ctx.fill();

		ctx.globalAlpha = 1;
		ctx.fillStyle = ink;
		ctx.textAlign = align;
		ctx.textBaseline = 'middle';
		const tx = align === 'center' ? x : align === 'left' ? x + padX : x - padX;
		ctx.fillText(text, tx, y);
	}

	function drawBackgroundBands(u: uPlot): void {
		const yDayTop = u.valToPos(SOLAR_MORNING_REF, 'y', true);
		const yDayBottom = u.valToPos(SOLAR_EVENING_REF, 'y', true);
		if (!Number.isFinite(yDayTop) || !Number.isFinite(yDayBottom)) return;

		const { left, width } = u.bbox;
		const dayTop = Math.min(yDayTop, yDayBottom);
		const dayHeight = Math.abs(yDayBottom - yDayTop);
		const ctx = u.ctx;
		const { fillDaytime, fillWorkhours } = chartState.colors;
		const xs = u.data[0];
		const starts = u.data[3] as (number | null)[];
		const ends = u.data[4] as (number | null)[];

		ctx.save();
		ctx.fillStyle = fillDaytime;
		ctx.fillRect(left, dayTop, width, dayHeight);

		ctx.fillStyle = fillWorkhours;
		ctx.beginPath();
		let pathOpen = false;
		for (let i = 0; i < xs.length; i++) {
			const startH = starts[i];
			const endH = ends[i];
			if (startH == null || endH == null) continue;
			const x = u.valToPos(xs[i], 'x', true);
			const yStart = u.valToPos(startH, 'y', true);
			const yEnd = u.valToPos(endH, 'y', true);
			if (!Number.isFinite(x) || !Number.isFinite(yStart) || !Number.isFinite(yEnd)) continue;
			const yTop = Math.min(yStart, yEnd);
			if (!pathOpen) {
				ctx.moveTo(x, yTop);
				pathOpen = true;
			} else {
				ctx.lineTo(x, yTop);
			}
		}
		for (let i = xs.length - 1; i >= 0; i--) {
			const startH = starts[i];
			const endH = ends[i];
			if (startH == null || endH == null) continue;
			const x = u.valToPos(xs[i], 'x', true);
			const yStart = u.valToPos(startH, 'y', true);
			const yEnd = u.valToPos(endH, 'y', true);
			if (!Number.isFinite(x) || !Number.isFinite(yStart) || !Number.isFinite(yEnd)) continue;
			const yBottom = Math.max(yStart, yEnd);
			ctx.lineTo(x, yBottom);
		}
		if (pathOpen) {
			ctx.closePath();
			ctx.fill();
		}
		ctx.restore();
	}

	function drawSolarRefLabels(u: uPlot): void {
		const ySunrise = u.valToPos(SOLAR_MORNING_REF, 'y', true);
		const ySunset = u.valToPos(SOLAR_EVENING_REF, 'y', true);
		if (!Number.isFinite(ySunrise) || !Number.isFinite(ySunset)) return;

		const xStart = u.bbox.left + 6;
		const ctx = u.ctx;
		const colors = chartState.colors;

		ctx.save();
		drawLineLabel(ctx, 'sunrise', xStart, ySunrise, 'left', colors);
		drawLineLabel(ctx, 'sunset', xStart, ySunset, 'left', colors);
		ctx.restore();
	}

	function drawTodayMarker(u: uPlot): void {
		const doy = chartState.currentDoy;
		if (doy == null) return;
		const x = u.valToPos(doy, 'x', true);
		if (x == null || !Number.isFinite(x)) return;
		const { top, height } = u.bbox;
		const ctx = u.ctx;
		const { clock } = chartState.colors;
		ctx.save();
		ctx.strokeStyle = clock;
		ctx.globalAlpha = 0.75;
		ctx.lineWidth = 2.5;
		ctx.setLineDash([6, 5]);
		ctx.beginPath();
		ctx.moveTo(x, top);
		ctx.lineTo(x, top + height);
		ctx.stroke();
		ctx.setLineDash([]);
		drawLineLabel(ctx, 'today', x, top + 10, 'center', chartState.colors, clock);
		ctx.restore();
	}

	function drawChartOverlays(u: uPlot): void {
		drawSolarRefLabels(u);
		drawTodayMarker(u);
	}

	function drawUnderSeries(u: uPlot): void {
		drawBackgroundBands(u);
	}

	function updateTooltip(u: uPlot): void {
		const idx = u.cursor.idx;
		if (idx == null || idx < 0) {
			tooltipVisible = false;
			return;
		}
		const doy = u.data[0][idx];
		const start = u.data[3][idx];
		const end = u.data[4][idx];
		if (doy == null) {
			tooltipVisible = false;
			return;
		}
		const loc = get(location);
		tooltipDate = formatDoyLabel(chartState.year, doy);
		const daySection = formatYearlyTooltipDaySection(
			sunEventsForDayOfYear(loc, chartState.year, doy),
			loc.timezone
		);
		tooltipPolarNote = daySection.polarNote;
		tooltipSunTimesLine = daySection.sunTimesLine;
		tooltipDayNightLine = daySection.dayNightLine;
		tooltipStartSolar = start == null || !Number.isFinite(start) ? '—' : formatSolarHours(start);
		tooltipEndSolar = end == null || !Number.isFinite(end) ? '—' : formatSolarHours(end);
		if (start != null && end != null && Number.isFinite(start) && Number.isFinite(end)) {
			tooltipOverlap = formatWorkhoursOverlapLabel(workdaySolarOverlapFractions(start, end));
		} else {
			tooltipOverlap = '';
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

	function buildOptions(width: number, yRange: { min: number; max: number }): uPlot.Options {
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
				setCursor: [updateTooltip],
				drawAxes: [drawUnderSeries],
				draw: [drawChartOverlays]
			},
			scales: {
				x: { min: 1, max: series?.dayOfYear.length ?? 365 },
				y: { min: yRange.min, max: yRange.max }
			},
			axes: [
				{
					scale: 'x',
					stroke: colors.fg,
					grid: { stroke: colors.grid },
					ticks: { stroke: colors.grid },
					splits: monthAxisSplits,
					values: monthAxisValues
				},
				{
					scale: 'y',
					stroke: colors.fg,
					grid: { stroke: colors.grid },
					ticks: { stroke: colors.grid },
					splits: () => [0, 6, 12, 18, 24],
					values: (_u, splits) => splits.map((v) => String(v))
				}
			],
			series: [
				{ label: 'Day' },
				{
					label: 'Solar morning',
					stroke: colors.solar,
					width: 2,
					points: { show: false }
				},
				{
					label: 'Solar evening',
					stroke: colors.solar,
					width: 2,
					dash: [6, 4],
					points: { show: false }
				},
				{
					label: 'Workday start',
					stroke: colors.clock,
					width: 2,
					points: { show: false }
				},
				{
					label: 'Workday end',
					stroke: colors.clock,
					width: 2,
					dash: [4, 4],
					points: { show: false }
				}
			]
		};
	}

	function rebuildChartForTheme(): void {
		if (!chartEl || !plot || !series) return;
		const data = plot.data;
		const yRange = yearlyDriftYRange();
		plot.destroy();
		plot = undefined;
		chartState.colors = readColors();
		plot = new uPlot(buildOptions(Math.max(chartEl.clientWidth, 280), yRange), data, chartEl);
	}

	function refreshChart(): void {
		if (!chartEl) return;

		const loc = $location;
		chartState.year = new Date().getFullYear();
		chartState.currentDoy = currentDayOfYear(loc.timezone, chartState.year);
		observesDst = locationObservesDst(loc.timezone, chartState.year);
		series = computeYearlyDrift(loc, {
			year: chartState.year,
			workdayStart,
			workdayEnd
		});

		const data = yearlyDriftUplotData(series);
		const yRange = yearlyDriftYRange();
		const width = Math.max(chartEl.clientWidth, 280);

		if (plot) {
			plot.setData(data, false);
			plot.setScale('x', { min: 1, max: series.dayOfYear.length });
			plot.setScale('y', yRange);
		} else {
			chartState.colors = readColors(chartEl);
			plot = new uPlot(buildOptions(width, yRange), data, chartEl);
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
			rebuildChartForTheme();
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
	<h3 class="yearly-drift-title">Solarflow year graph</h3>

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
		<p id="yearly-drift-summary" class="sr-only" aria-live="polite">
			Yearly chart mapping workday start {formatTimeInput(workdayStart)} and end {formatTimeInput(
				workdayEnd
			)} to solar time through {chartState.year}.
			{#if tooltipVisible}
				At {tooltipDate},
				{#if tooltipPolarNote}
					{tooltipPolarNote}.
				{/if}
				{#if tooltipSunTimesLine}
					{tooltipSunTimesLine}.
				{/if}
				{tooltipDayNightLine}. Start maps to solar {tooltipStartSolar}, end to solar {tooltipEndSolar}.
				{#if tooltipOverlap}
					{tooltipOverlap}.
				{/if}
			{/if}
		</p>
		<div
			class="yearly-drift-chart"
			bind:this={chartEl}
			role="img"
			aria-labelledby="yearly-drift-summary"
		></div>
		{#if tooltipVisible}
			<div class="yearly-drift-tooltip" style:left="{tooltipLeft}px" style:top="{tooltipTop}px">
				<p class="tooltip-date"><strong>{tooltipDate}</strong></p>
				<div class="tooltip-day">
					{#if tooltipPolarNote}
						<p class="tooltip-polar">{tooltipPolarNote}</p>
					{/if}
					{#if tooltipSunTimesLine}
						<p>{tooltipSunTimesLine}</p>
					{/if}
					<p>{tooltipDayNightLine}</p>
				</div>
				<div class="tooltip-workday" aria-label="Workday mapping">
					<p>Start {formatTimeInput(workdayStart)} → solar {tooltipStartSolar}</p>
					<p>End {formatTimeInput(workdayEnd)} → solar {tooltipEndSolar}</p>
					{#if tooltipOverlap}
						<p class="tooltip-overlap">{tooltipOverlap}</p>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	{#if observesDst}
		<p class="yearly-drift-dst-note">
			* Sudden jumps in the graph are due to DST (Daylight Saving Time).
		</p>
	{/if}
</div>

<style>
	.yearly-drift {
		width: 100%;
	}

	.yearly-drift-title {
		margin: 0 0 0.75rem;
		font-size: 1rem;
		font-weight: 600;
		letter-spacing: -0.01em;
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
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		max-width: min(20rem, calc(100vw - 2rem));
		padding: 0.4rem 0.55rem;
		font-size: 0.75rem;
		line-height: 1.4;
		font-variant-numeric: tabular-nums;
		border-radius: 0.25rem;
		background: color-mix(in srgb, var(--color-bg) 92%, var(--color-fg));
		border: 1px solid var(--color-grid);
		box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
		transform: translateY(-100%);
	}

	.yearly-drift-tooltip p {
		margin: 0;
	}

	.tooltip-date strong {
		font-weight: 600;
	}

	.tooltip-day {
		color: var(--color-muted);
	}

	.tooltip-polar {
		font-style: italic;
	}

	.tooltip-workday {
		padding-top: 0.3rem;
		border-top: 1px solid var(--color-grid);
	}

	.tooltip-overlap {
		color: var(--color-muted);
	}

	.yearly-drift-dst-note {
		margin: 0.35rem 0 0;
		font-size: 0.7rem;
		opacity: 0.55;
	}
</style>
