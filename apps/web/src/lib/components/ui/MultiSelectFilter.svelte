<script lang="ts">
	import { Popover } from 'bits-ui';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	let {
		label,
		options,
		values = $bindable<string[]>([]),
		placeholder = 'Toate',
		onchange
	}: {
		label: string;
		options: { value: string; label: string }[];
		values?: string[];
		placeholder?: string;
		onchange?: () => void;
	} = $props();
	const summary = $derived(
		values.length
			? options
					.filter((option) => values.includes(option.value))
					.map((option) => option.label)
					.join(', ')
			: placeholder
	);
	function toggle(value: string, checked: boolean) {
		values = checked ? [...values, value] : values.filter((selected) => selected !== value);
		onchange?.();
	}
</script>

<div class="multi-filter">
	<span class="filter-label">{label}</span>
	<Popover.Root>
		<Popover.Trigger class="filter-trigger" aria-label={`${label}: ${summary}`} title={summary}>
			<span>{summary}</span>{#if values.length > 1}<span class="filter-count" aria-hidden="true"
					>{values.length}</span
				>{/if}<ChevronDown size={16} aria-hidden="true" />
		</Popover.Trigger>
		<Popover.Portal>
			<Popover.Content
				class="filter-popover"
				role="dialog"
				align="start"
				sideOffset={6}
				aria-label={label}
			>
				<div class="filter-heading">
					<strong>{label}</strong><button
						type="button"
						disabled={!values.length}
						onclick={() => {
							values = [];
							onchange?.();
						}}>Toate</button
					>
				</div>
				<div class="filter-options" role="group" aria-label={`Opțiuni ${label}`}>
					{#each options as option (option.value)}
						<label
							><input
								type="checkbox"
								checked={values.includes(option.value)}
								onchange={(event) => toggle(option.value, event.currentTarget.checked)}
							/>{option.label}</label
						>
					{/each}
					{#if !options.length}<span>Nu există opțiuni disponibile.</span>{/if}
				</div>
			</Popover.Content>
		</Popover.Portal>
	</Popover.Root>
</div>

<style>
	.multi-filter {
		display: grid;
		flex: 1 1 160px;
		min-width: min(100%, 160px);
		gap: 5px;
	}
	.filter-label {
		font-size: 12px;
		color: var(--sc-muted);
	}
	:global(.filter-trigger) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		width: 100%;
		min-width: 0;
		height: 40px;
		padding: 9px 12px;
		border: 1px solid var(--sc-border-strong);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
		font-size: 14px;
		text-align: left;
	}
	:global(.filter-trigger > span:first-child) {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.filter-trigger > svg) {
		flex-shrink: 0;
	}
	.filter-count {
		flex-shrink: 0;
		padding: 1px 6px;
		border-radius: 10px;
		background: var(--sc-inset);
		font-size: 12px;
	}
	:global(.filter-popover) {
		z-index: 50;
		width: max(240px, var(--bits-popover-anchor-width));
		max-width: calc(100vw - 32px);
		padding: 12px;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		box-shadow: var(--sc-shadow);
	}
	.filter-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 8px;
	}
	.filter-heading button {
		background: transparent;
		color: var(--sc-ink);
		border: 1px solid var(--sc-border);
		border-radius: 5px;
		padding: 4px 8px;
	}
	.filter-options {
		display: grid;
		gap: 4px;
		max-height: min(320px, 50vh);
		overflow-y: auto;
	}
	.filter-options label {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 2px;
		font-size: 14px;
		cursor: pointer;
	}
	.filter-options input {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}
</style>
