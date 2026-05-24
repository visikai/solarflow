<script lang="ts">
	import { resolve } from '$app/paths';
	import LocationPicker from '$lib/components/LocationPicker.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import DualClocks from '$lib/components/viz/DualClocks.svelte';
	import TimelineStrip from '$lib/components/viz/TimelineStrip.svelte';
	import YearlyDrift from '$lib/components/viz/YearlyDrift.svelte';
</script>

<div class="app-shell">
	<header class="app-header">
		<div class="app-content">
			<div class="app-header-top">
				<a class="app-brand" href={resolve('/')}>
					<Logo />
				</a>
			</div>
			<LocationPicker />
		</div>
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
		--content-max-width: 56rem;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.app-header {
		width: 100%;
		border-bottom: 1px solid var(--color-border);
	}

	.app-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		max-width: var(--content-max-width);
		margin: 0 auto;
		padding: 1rem;
		box-sizing: border-box;
	}

	@media (min-width: 48rem) {
		.app-content {
			gap: 1rem;
			padding: 1.5rem;
		}
	}

	.app-header-top {
		display: flex;
		justify-content: center;
		width: 100%;
	}

	.app-brand {
		display: block;
		width: 100%;
		max-width: 16rem;
		line-height: 0;
		text-decoration: none;
	}

	.app-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		width: 100%;
		max-width: var(--content-max-width);
		margin: 0 auto;
		box-sizing: border-box;
	}

	@media (min-width: 48rem) {
		.app-main {
			padding: 1.5rem;
			gap: 1.25rem;
		}
	}

	.viz-zone {
		width: 100%;
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
		min-height: 22rem;
	}
</style>
