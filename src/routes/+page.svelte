<script lang="ts">
	import LocationPicker from '$lib/components/LocationPicker.svelte';
	import DualClocks from '$lib/components/viz/DualClocks.svelte';
	import TimelineStrip from '$lib/components/viz/TimelineStrip.svelte';
	import YearlyDrift from '$lib/components/viz/YearlyDrift.svelte';
	import { cycleThemePreference, theme, themeToggleLabel } from '$lib/stores/theme.js';

	function toggleTheme(): void {
		theme.update(cycleThemePreference);
	}
</script>

<div class="app-shell">
	<header class="app-header">
		<div class="app-header-row">
			<h1 class="app-title">solarflow</h1>
			<button
				type="button"
				class="theme-toggle"
				aria-label={themeToggleLabel($theme)}
				aria-pressed={$theme === 'system' ? undefined : $theme === 'dark'}
				title={themeToggleLabel($theme)}
				onclick={toggleTheme}
			>
				<span class="theme-toggle__icon" aria-hidden="true">
					{#if $theme === 'light'}☀{:else if $theme === 'dark'}☾{:else}◐{/if}
				</span>
				<span class="theme-toggle__label">
					{$theme === 'system' ? 'System' : $theme === 'light' ? 'Light' : 'Dark'}
				</span>
			</button>
		</div>
		<LocationPicker />
	</header>

	<main class="app-main">
		<section class="viz-zone viz-zone--timeline" data-viz="timeline" aria-label="Timeline">
			<TimelineStrip />
		</section>
		<section class="viz-zone viz-zone--clocks" data-viz="clocks" aria-label="Clocks">
			<DualClocks />
		</section>
		<section
			class="viz-zone viz-zone--yearly-drift"
			data-viz="yearly-drift"
			aria-label="Yearly drift"
		>
			<YearlyDrift />
		</section>
	</main>
</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.app-header {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	@media (min-width: 48rem) {
		.app-header {
			gap: 1rem;
			padding: 1.5rem;
		}
	}

	.app-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.theme-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.65rem;
		font: inherit;
		font-size: 0.875rem;
		color: var(--color-fg);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		cursor: pointer;
	}

	.theme-toggle:hover {
		background: color-mix(in srgb, var(--color-bg) 88%, var(--color-fg));
	}

	.theme-toggle:focus-visible {
		outline: 2px solid var(--color-accent-linear);
		outline-offset: 2px;
	}

	.theme-toggle__icon {
		font-size: 1rem;
		line-height: 1;
	}

	.app-title {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.app-main {
		flex: 1;
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
		padding: 1rem;
	}

	@media (min-width: 48rem) {
		.app-main {
			padding: 1.5rem;
		}
	}

	@media (min-width: 64rem) {
		.app-main {
			grid-template-columns: 1fr 1fr;
			gap: 1.25rem;
		}
	}

	.viz-zone {
		min-height: 8rem;
		border: 1px dashed var(--color-grid);
		border-radius: 0.5rem;
	}

	.viz-zone--timeline,
	.viz-zone--clocks,
	.viz-zone--yearly-drift {
		padding: 0.75rem 1rem;
		border-style: solid;
	}

	.viz-zone--yearly-drift {
		grid-column: 1 / -1;
		min-height: 22rem;
	}
</style>
