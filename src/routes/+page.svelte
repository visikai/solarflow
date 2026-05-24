<script lang="ts">
	import LocationPicker from '$lib/components/LocationPicker.svelte';
	import DualClocks from '$lib/components/viz/DualClocks.svelte';
	import TimelineStrip from '$lib/components/viz/TimelineStrip.svelte';
	import YearlyDrift from '$lib/components/viz/YearlyDrift.svelte';
</script>

<div class="app-shell">
	<header class="app-header">
		<h1 class="app-title">solarflow</h1>
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
