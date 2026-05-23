<script lang="ts">
	import {
		GeolocationDeniedError,
		GeolocationTimeoutError,
		GeolocationUnavailableError
	} from '$lib/errors.js';
	import { geocodeSuggest } from '$lib/geocode.js';
	import { getBrowserLocation } from '$lib/geolocation.js';
	import { PRESETS } from '$lib/presets.js';
	import { location } from '$lib/stores/location.js';
	import type { Location } from '$lib/types.js';

	const SEARCH_DEBOUNCE_MS = 400;

	let geoLoading = $state(false);
	let geoError = $state<string | null>(null);
	let searchQuery = $state('');
	let searchResults = $state<Location[]>([]);
	let searchLoading = $state(false);
	let searchError = $state<string | null>(null);
	let dropdownOpen = $state(false);
	let highlightIndex = $state(-1);
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	function locationsMatch(a: Location, b: Location): boolean {
		return (
			a.name === b.name &&
			a.latitude === b.latitude &&
			a.longitude === b.longitude &&
			a.timezone === b.timezone
		);
	}

	function presetIndexFor(loc: Location): number {
		return PRESETS.findIndex((preset) => locationsMatch(preset, loc));
	}

	function selectLocation(loc: Location): void {
		location.set(loc);
		searchQuery = '';
		searchResults = [];
		dropdownOpen = false;
		highlightIndex = -1;
		searchError = null;
	}

	function onPresetChange(event: Event): void {
		const select = event.currentTarget as HTMLSelectElement;
		const index = Number.parseInt(select.value, 10);
		if (index >= 0 && index < PRESETS.length) {
			selectLocation(PRESETS[index]);
		}
	}

	function geolocationErrorMessage(err: unknown): string {
		if (err instanceof GeolocationDeniedError) return 'Location access denied.';
		if (err instanceof GeolocationTimeoutError) return 'Location request timed out.';
		if (err instanceof GeolocationUnavailableError) return 'Location unavailable.';
		return err instanceof Error ? err.message : 'Could not get location.';
	}

	async function useMyLocation(): Promise<void> {
		geoLoading = true;
		geoError = null;
		try {
			selectLocation(await getBrowserLocation());
		} catch (err) {
			geoError = geolocationErrorMessage(err);
		} finally {
			geoLoading = false;
		}
	}

	function scheduleSearch(query: string): void {
		clearTimeout(debounceTimer);

		const trimmed = query.trim();
		if (!trimmed) {
			searchResults = [];
			dropdownOpen = false;
			searchLoading = false;
			searchError = null;
			highlightIndex = -1;
			return;
		}

		searchLoading = true;
		searchError = null;

		debounceTimer = setTimeout(async () => {
			try {
				const results = await geocodeSuggest(trimmed);
				searchResults = results;
				dropdownOpen = results.length > 0;
				highlightIndex = -1;
			} catch (err) {
				searchError = err instanceof Error ? err.message : 'Search failed';
				searchResults = [];
				dropdownOpen = false;
				highlightIndex = -1;
			} finally {
				searchLoading = false;
			}
		}, SEARCH_DEBOUNCE_MS);
	}

	function onSearchInput(event: Event): void {
		const value = (event.currentTarget as HTMLInputElement).value;
		searchQuery = value;
		scheduleSearch(value);
	}

	function onSearchKeydown(event: KeyboardEvent): void {
		if (!dropdownOpen || searchResults.length === 0) {
			if (event.key === 'Escape') {
				dropdownOpen = false;
				highlightIndex = -1;
			}
			return;
		}

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				highlightIndex = Math.min(highlightIndex + 1, searchResults.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				highlightIndex = Math.max(highlightIndex - 1, 0);
				break;
			case 'Enter':
				event.preventDefault();
				if (highlightIndex >= 0 && highlightIndex < searchResults.length) {
					selectLocation(searchResults[highlightIndex]);
				}
				break;
			case 'Escape':
				event.preventDefault();
				dropdownOpen = false;
				highlightIndex = -1;
				break;
		}
	}

	function onSearchBlur(): void {
		// Defer so mousedown on a result can fire first.
		setTimeout(() => {
			dropdownOpen = false;
			highlightIndex = -1;
		}, 150);
	}
</script>

<div class="location-picker">
	<p class="current">
		<span class="label">Selected</span>
		<strong>{$location.name}</strong>
		<span class="coords">
			{$location.latitude.toFixed(4)}°, {$location.longitude.toFixed(4)}° · {$location.timezone}
		</span>
	</p>

	<div class="controls">
		<label class="field">
			Preset
			<select
				value={presetIndexFor($location) >= 0 ? String(presetIndexFor($location)) : ''}
				onchange={onPresetChange}
			>
				<option value="" disabled hidden={presetIndexFor($location) >= 0}>Custom location</option>
				{#each PRESETS as preset, index (preset.name)}
					<option value={String(index)}>{preset.name}</option>
				{/each}
			</select>
		</label>

		<div class="field geo">
			<button type="button" onclick={useMyLocation} disabled={geoLoading}>
				{geoLoading ? 'Locating…' : 'Use my location'}
			</button>
			{#if geoError}
				<p class="error" role="alert">{geoError}</p>
			{/if}
		</div>

		<label class="field search">
			Search
			<div class="search-wrap">
				<input
					type="search"
					placeholder="City or place name"
					value={searchQuery}
					oninput={onSearchInput}
					onkeydown={onSearchKeydown}
					onblur={onSearchBlur}
					autocomplete="off"
					role="combobox"
					aria-expanded={dropdownOpen}
					aria-controls="location-search-results"
					aria-activedescendant={highlightIndex >= 0
						? `location-result-${highlightIndex}`
						: undefined}
				/>
				{#if searchLoading}
					<span class="search-status" aria-live="polite">Searching…</span>
				{/if}
				{#if dropdownOpen}
					<ul id="location-search-results" class="dropdown" role="listbox">
						{#each searchResults as result, index (result.name + result.latitude)}
							<li
								id="location-result-{index}"
								role="option"
								aria-selected={index === highlightIndex}
								class:highlighted={index === highlightIndex}
							>
								<button type="button" onmousedown={() => selectLocation(result)}>
									{result.name}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
			{#if searchError}
				<p class="error" role="alert">{searchError}</p>
			{/if}
		</label>
	</div>
</div>

<style>
	.location-picker {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-bg);
	}

	.current {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-border);
	}

	.coords {
		font-size: 0.875rem;
		color: var(--color-border);
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: flex-start;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		min-width: 12rem;
		font-size: 0.875rem;
		font-weight: 600;
	}

	select,
	input[type='search'],
	button {
		font: inherit;
		color: var(--color-fg);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 0.25rem;
		padding: 0.375rem 0.5rem;
	}

	button {
		cursor: pointer;
		background: var(--color-accent-linear);
		color: var(--color-bg);
		border-color: var(--color-accent-linear);
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.search-wrap {
		position: relative;
	}

	.search-status {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.75rem;
		color: var(--color-border);
		pointer-events: none;
	}

	.dropdown {
		position: absolute;
		z-index: 10;
		top: calc(100% + 0.25rem);
		left: 0;
		right: 0;
		margin: 0;
		padding: 0.25rem 0;
		list-style: none;
		border: 1px solid var(--color-border);
		border-radius: 0.25rem;
		background: var(--color-bg);
		box-shadow: 0 4px 12px rgb(0 0 0 / 0.08);
		max-height: 12rem;
		overflow-y: auto;
	}

	.dropdown li button {
		display: block;
		width: 100%;
		text-align: left;
		background: transparent;
		color: var(--color-fg);
		border: none;
		border-radius: 0;
		padding: 0.375rem 0.5rem;
	}

	.dropdown li.highlighted button,
	.dropdown li button:hover {
		background: var(--color-grid);
	}

	.error {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-accent-solar);
	}
</style>
