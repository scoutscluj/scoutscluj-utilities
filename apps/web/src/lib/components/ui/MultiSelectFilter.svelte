<script lang="ts">
	import { Popover } from 'bits-ui';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	const id = $props.id();
	let {
		label,
		options,
		values = $bindable<string[]>([]),
		placeholder = 'Toate',
		onchange
	}: {
		label: string;
		options: { value: string; label: string; description?: string }[];
		values?: string[];
		placeholder?: string;
		onchange?: (values: string[]) => void;
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
		onchange?.(values);
	}
</script>

<div class="multi-filter">
	<span class="filter-label">{label}</span>
	<Popover.Root>
		<Popover.Trigger
			class="filter-trigger"
			data-active={values.length > 0 || undefined}
			aria-label={`${label}: ${summary}`}
			title={summary}
		>
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
				collisionPadding={12}
				aria-label={label}
			>
				<div class="filter-heading">
					<div>
						<strong>{label}</strong><span
							>{values.length === 1
								? '1 opțiune selectată'
								: values.length
									? `${values.length} opțiuni selectate`
									: 'Toate opțiunile'}</span
						>
					</div>
					<button
						type="button"
						disabled={!values.length}
						onclick={() => {
							values = [];
							onchange?.(values);
						}}>Toate</button
					>
				</div>
				<div class="filter-options" role="group" aria-label={`Opțiuni ${label}`}>
					{#each options as option (option.value)}
						<label class={{ chosen: values.includes(option.value) }}
							><input
								type="checkbox"
								checked={values.includes(option.value)}
								aria-label={option.label}
								aria-describedby={option.description
									? `${id}-${option.value}-description`
									: undefined}
								onchange={(event) => toggle(option.value, event.currentTarget.checked)}
							/><span class="option-copy"
								><span>{option.label}</span>{#if option.description}<small
										id={`${id}-${option.value}-description`}>{option.description}</small
									>{/if}</span
							></label
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
		min-width: 0;
		gap: 6px;
	}
	.filter-label {
		font-size: 12px;
		color: var(--sc-muted);
		font-weight: 500;
	}
	:global(.filter-trigger) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		width: 100%;
		min-width: 0;
		height: 40px;
		padding: 9px 11px;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
		font-size: 14px;
		text-align: left;
		cursor: pointer;
		transition:
			border-color 150ms,
			background-color 150ms,
			box-shadow 150ms;
	}
	:global(.filter-trigger:hover) {
		border-color: var(--sc-border-strong);
		background: var(--sc-canvas);
	}
	:global(.filter-trigger:not([data-active])) {
		color: var(--sc-muted);
	}
	:global(.filter-trigger[data-active]) {
		border-color: color-mix(in srgb, var(--sc-accent) 28%, var(--sc-border));
		background: color-mix(in srgb, var(--sc-accent-soft) 30%, var(--sc-surface));
	}
	:global(.filter-trigger[data-state='open']),
	:global(.filter-trigger:focus-visible) {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
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
		background: var(--sc-accent-soft);
		color: var(--sc-accent);
		font-size: 12px;
	}
	:global(.filter-popover) {
		z-index: 50;
		width: max(280px, var(--bits-popover-anchor-width));
		box-sizing: border-box;
		max-width: calc(100vw - 32px);
		padding: 12px;
		border: 1px solid var(--sc-border);
		border-radius: 12px;
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
		padding: 2px 4px 12px;
		border-bottom: 1px solid var(--sc-border);
	}
	.filter-heading > div {
		display: grid;
		gap: 2px;
	}
	.filter-heading strong {
		font-size: 14px;
		font-weight: 600;
	}
	.filter-heading span {
		font-size: 12px;
		color: var(--sc-muted);
	}
	.filter-heading button {
		background: transparent;
		color: var(--sc-accent);
		border: 0;
		border-radius: 4px;
		padding: 6px 8px;
		font-size: 12px;
		cursor: pointer;
	}
	.filter-heading button:disabled {
		color: var(--sc-muted);
		cursor: default;
		opacity: 0.55;
	}
	.filter-heading button:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
	}
	.filter-options {
		display: grid;
		gap: 3px;
		max-height: min(320px, 50vh);
		overflow-y: auto;
	}
	.filter-options label {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 40px;
		padding: 8px;
		box-sizing: border-box;
		border-radius: 6px;
		font-size: 14px;
		cursor: pointer;
	}
	.filter-options label:hover {
		background: var(--sc-canvas);
	}
	.filter-options label.chosen {
		background: var(--sc-accent-soft);
	}
	.option-copy {
		display: grid;
		gap: 2px;
	}
	.option-copy small {
		color: var(--sc-muted);
		font-size: 12px;
	}
	.filter-options input {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		margin: 0;
		accent-color: var(--sc-accent);
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.filter-trigger) {
			transition: none;
		}
	}
</style>
