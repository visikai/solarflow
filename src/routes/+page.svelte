<script lang="ts">
	import LocationPicker from '$lib/components/LocationPicker.svelte';
	import DualClocks from '$lib/components/viz/DualClocks.svelte';
	import TimelineStrip from '$lib/components/viz/TimelineStrip.svelte';
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
		<section class="viz-zone" data-viz="sun-arc" aria-label="Sun arc"></section>
		<section class="viz-zone" data-viz="mapping-curve" aria-label="Mapping curve"></section>
		<section class="viz-zone" data-viz="yearly-drift" aria-label="Yearly drift"></section>
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
		gap: 1rem;
		padding: 1.5rem;
		border-bottom: 1px solid var(--color-border);
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
		padding: 1.5rem;
	}

	.viz-zone {
		min-height: 8rem;
		border: 1px dashed var(--color-grid);
		border-radius: 0.5rem;
	}

	.viz-zone--timeline {
		padding: 0.75rem 1rem;
		border-style: solid;
	}
</style>
