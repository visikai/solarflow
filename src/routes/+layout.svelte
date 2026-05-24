<script lang="ts">
	import { assets } from '$app/paths';
	import '../app.css';
	import '$lib/stores/theme.js';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="{assets}/favicon.svg" />
</svelte:head>

{@render children()}
