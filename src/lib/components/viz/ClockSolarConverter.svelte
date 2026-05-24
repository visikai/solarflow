<script lang="ts">
	import { PolarSunError } from '$lib/errors.js';
	import { localDecimalHours } from '$lib/mappingCurve.js';
	import { location } from '$lib/stores/location.js';
	import { clockNow } from '$lib/stores/time.js';
	import { get } from 'svelte/store';
	import { formatTimeInput } from '$lib/timeInput.js';
	import {
		convertClockRangeToSolar,
		convertSolarRangeToClock,
		formatDateInputInZone,
		noonAnchorForDateInput,
		sunEventsForDateInput,
		type ConvertedRange
	} from '$lib/timeConvert.js';
	import TimeConvertPanel from './TimeConvertPanel.svelte';

	let dateInput = $state(formatDateInputInZone(new Date(), get(location).timezone));
	let clockFrom = $state(9);
	let clockTo = $state<number | null>(17);
	let solarFrom = $state(6);
	let solarTo = $state<number | null>(18);

	let clockStatus = $state('');
	let solarStatus = $state('');
	let clockError = $state('');
	let solarError = $state('');

	let events = $derived(sunEventsForDateInput(dateInput, $location));
	let polar = $derived(events.polar);
	let convertDisabled = $derived(polar !== null);

	let todayDateInput = $derived(formatDateInputInZone($clockNow, $location.timezone));
	let isSelectedToday = $derived(dateInput !== '' && dateInput === todayDateInput);

	let contextLabel = $derived.by(() => {
		if (dateInput === '') return $location.name;
		const anchor = noonAnchorForDateInput(dateInput, $location.timezone);
		const dateLabel = new Intl.DateTimeFormat(undefined, {
			timeZone: $location.timezone,
			dateStyle: 'medium'
		}).format(anchor);
		return `${dateLabel} · ${$location.name}`;
	});

	$effect(() => {
		void $location.name;
		void $location.timezone;
		dateInput = formatDateInputInZone(new Date(), $location.timezone);
		clockError = '';
		solarError = '';
		clockStatus = '';
		solarStatus = '';
	});

	function formatRangeMessage(label: string, range: ConvertedRange): string {
		if (range.to === null) {
			return `${label}: ${formatTimeInput(range.from)}`;
		}
		return `${label}: ${formatTimeInput(range.from)} – ${formatTimeInput(range.to)}`;
	}

	function convertToSolar() {
		clockError = '';
		solarError = '';
		solarStatus = '';
		try {
			const result = convertClockRangeToSolar(clockFrom, clockTo, $location, events.date, events);
			solarFrom = result.from;
			solarTo = result.to;
			solarStatus = formatRangeMessage('Updated solar', result);
		} catch (err) {
			clockError =
				err instanceof PolarSunError
					? 'Solar conversion is unavailable during polar day or night.'
					: 'Could not convert to solar time.';
		}
	}

	function convertToClock() {
		clockError = '';
		solarError = '';
		clockStatus = '';
		try {
			const result = convertSolarRangeToClock(solarFrom, solarTo, $location, events);
			clockFrom = result.from;
			clockTo = result.to;
			clockStatus = formatRangeMessage('Updated clock', result);
		} catch (err) {
			solarError =
				err instanceof PolarSunError
					? 'Clock conversion is unavailable during polar day or night.'
					: 'Could not convert to clock time.';
		}
	}

	function useClockNow() {
		clockFrom = localDecimalHours($clockNow, $location.timezone);
		clockTo = null;
		clockError = '';
	}

	function useSolarNow() {
		try {
			const solar = convertClockRangeToSolar(
				localDecimalHours($clockNow, $location.timezone),
				null,
				$location,
				events.date,
				events
			).from;
			solarFrom = solar;
			solarTo = null;
			solarError = '';
		} catch {
			solarError = 'Could not read current solar time.';
		}
	}

	function setDateToday() {
		dateInput = todayDateInput;
	}
</script>

<section class="clock-solar-converter" aria-labelledby="converter-title">
	<header class="converter-header">
		<h3 id="converter-title" class="converter-title">Clock ↔ Solar converter ({contextLabel})</h3>
		<p class="converter-lead">Convert clock times and solar times for a given day.</p>
	</header>

	<div class="converter-date-row">
		<label class="converter-date" for="converter-date">
			<span class="converter-date-label">Date</span>
			<input
				id="converter-date"
				type="date"
				bind:value={dateInput}
				onchange={() => {
					clockError = '';
					solarError = '';
					clockStatus = '';
					solarStatus = '';
				}}
			/>
		</label>
		<button type="button" class="today-btn" disabled={isSelectedToday} onclick={setDateToday}>
			Today
		</button>
	</div>

	<div class="converter-panels">
		<TimeConvertPanel
			side="clock"
			title="Clock time"
			idPrefix="converter-clock"
			fromHours={clockFrom}
			toHours={clockTo}
			disabled={convertDisabled}
			disabledReason={polar === 'day'
				? 'Conversion unavailable during polar day.'
				: polar === 'night'
					? 'Conversion unavailable during polar night.'
					: ''}
			convertLabel="→ Solar"
			statusMessage={clockStatus}
			errorMessage={clockError}
			onconvert={convertToSolar}
			onusenow={useClockNow}
			onfromchange={(h) => {
				clockFrom = h;
				clockError = '';
			}}
			ontochange={(h) => {
				clockTo = h;
				clockError = '';
			}}
		/>

		<TimeConvertPanel
			side="solar"
			title="Solar time"
			idPrefix="converter-solar"
			fromHours={solarFrom}
			toHours={solarTo}
			disabled={convertDisabled}
			disabledReason={polar === 'day'
				? 'Conversion unavailable during polar day.'
				: polar === 'night'
					? 'Conversion unavailable during polar night.'
					: ''}
			convertLabel="← Clock"
			statusMessage={solarStatus}
			errorMessage={solarError}
			onconvert={convertToClock}
			onusenow={useSolarNow}
			onfromchange={(h) => {
				solarFrom = h;
				solarError = '';
			}}
			ontochange={(h) => {
				solarTo = h;
				solarError = '';
			}}
		/>
	</div>
</section>

<style>
	.clock-solar-converter {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
	}

	.converter-header {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.converter-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.converter-lead {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-muted);
		line-height: 1.45;
		max-width: 42rem;
	}

	.converter-date-row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.75rem;
	}

	.converter-date {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.converter-date-label {
		font-size: 0.75rem;
		color: var(--color-muted);
	}

	.converter-date input {
		font: inherit;
		font-variant-numeric: tabular-nums;
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 0.25rem;
		background: var(--color-bg);
		color: var(--color-fg);
	}

	.today-btn {
		font: inherit;
		font-size: 0.8125rem;
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 0.25rem;
		background: var(--color-bg);
		color: var(--color-fg);
		cursor: pointer;
	}

	.today-btn:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.converter-panels {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
		align-items: start;
	}

	@media (max-width: 35.99rem) {
		.converter-panels {
			grid-template-columns: 1fr;
		}
	}
</style>
