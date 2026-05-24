<script lang="ts">
	import { formatTimeInput, parseTimeInput } from '$lib/timeInput.js';

	interface Props {
		side: 'clock' | 'solar';
		idPrefix?: string;
		title: string;
		fromHours: number;
		toHours: number | null;
		disabled?: boolean;
		disabledReason?: string;
		convertLabel: string;
		statusMessage?: string;
		errorMessage?: string;
		onconvert: () => void;
		onusenow?: () => void;
		onfromchange: (hours: number) => void;
		ontochange: (hours: number | null) => void;
	}

	let {
		side,
		idPrefix = 'convert',
		title,
		fromHours,
		toHours,
		disabled = false,
		disabledReason = '',
		convertLabel,
		statusMessage = '',
		errorMessage = '',
		onconvert,
		onusenow,
		onfromchange,
		ontochange
	}: Props = $props();

	const fromId = $derived(`${idPrefix}-from`);
	const toId = $derived(`${idPrefix}-to`);
</script>

<aside class="convert-panel" class:clock={side === 'clock'} class:solar={side === 'solar'}>
	<p class="convert-panel-title">{title}</p>

	{#if disabled && disabledReason}
		<p class="convert-disabled">{disabledReason}</p>
	{:else}
		<div class="convert-fields">
			<label class="convert-field" for={fromId}>
				<span class="convert-label">From</span>
				<input
					id={fromId}
					type="time"
					value={formatTimeInput(fromHours)}
					{disabled}
					onchange={(e) => onfromchange(parseTimeInput(e.currentTarget.value))}
				/>
			</label>
			<label class="convert-field" for={toId}>
				<span class="convert-label">To</span>
				<input
					id={toId}
					type="time"
					value={toHours === null ? '' : formatTimeInput(toHours)}
					{disabled}
					placeholder="optional"
					onchange={(e) => {
						const v = e.currentTarget.value;
						ontochange(v === '' ? null : parseTimeInput(v));
					}}
				/>
			</label>
		</div>

		<div class="convert-actions">
			<button type="button" class="convert-btn primary" {disabled} onclick={onconvert}>
				{convertLabel}
			</button>
			{#if onusenow}
				<button type="button" class="convert-btn secondary" {disabled} onclick={onusenow}>
					Use now
				</button>
			{/if}
			{#if errorMessage}
				<p class="convert-error" role="alert">{errorMessage}</p>
			{:else if statusMessage}
				<p class="convert-status" aria-live="polite">{statusMessage}</p>
			{/if}
		</div>
	{/if}
</aside>

<style>
	.convert-panel {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		min-width: 0;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		background: color-mix(in srgb, var(--color-bg) 92%, var(--color-fg) 8%);
	}

	.convert-panel.clock {
		border-color: color-mix(in srgb, var(--color-accent-clock) 35%, var(--color-border));
	}

	.convert-panel.solar {
		border-color: color-mix(in srgb, var(--color-accent-solar) 35%, var(--color-border));
	}

	.convert-panel-title {
		margin: 0;
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	.convert-panel.clock .convert-panel-title {
		color: var(--color-accent-clock);
	}

	.convert-panel.solar .convert-panel-title {
		color: var(--color-accent-solar);
	}

	.convert-fields {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.convert-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.convert-label {
		font-size: 0.75rem;
		color: var(--color-muted);
	}

	.convert-field input {
		font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace;
		font-size: 0.9375rem;
		font-variant-numeric: tabular-nums;
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 0.25rem;
		background: var(--color-bg);
		color: var(--color-fg);
		width: 100%;
		box-sizing: border-box;
	}

	.convert-panel.clock .convert-field input:focus-visible {
		outline: 2px solid var(--color-accent-clock);
		outline-offset: 1px;
	}

	.convert-panel.solar .convert-field input:focus-visible {
		outline: 2px solid var(--color-accent-solar);
		outline-offset: 1px;
	}

	.convert-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem 0.75rem;
	}

	.convert-actions .convert-status,
	.convert-actions .convert-error {
		flex: 1 1 8rem;
		min-width: 0;
	}

	.convert-btn {
		font: inherit;
		font-size: 0.8125rem;
		padding: 0.375rem 0.625rem;
		border-radius: 0.25rem;
		border: 1px solid var(--color-border);
		cursor: pointer;
		background: var(--color-bg);
		color: var(--color-fg);
	}

	.convert-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.convert-btn.primary {
		font-weight: 600;
	}

	.convert-panel.clock .convert-btn.primary {
		border-color: var(--color-accent-clock);
		color: var(--color-accent-clock);
	}

	.convert-panel.solar .convert-btn.primary {
		border-color: var(--color-accent-solar);
		color: var(--color-accent-solar);
	}

	.convert-btn.secondary {
		opacity: 0.85;
	}

	.convert-error {
		margin: 0;
		font-size: 0.75rem;
		color: #b91c1c;
	}

	.convert-status {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-muted);
	}

	.convert-disabled {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--color-muted);
		line-height: 1.4;
	}

	@media (max-width: 47.99rem) {
		.convert-panel {
			width: 100%;
			max-width: 16rem;
			margin-inline: auto;
		}
	}
</style>
