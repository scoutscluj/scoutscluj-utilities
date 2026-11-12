<script lang="ts">
	import { Popover } from 'bits-ui';
	import Info from '@lucide/svelte/icons/info';
	let { label, text }: { label: string; text: string } = $props();
</script>

<Popover.Root>
	<Popover.Trigger class="info-trigger" type="button" aria-label={label} openOnHover openDelay={250}
		><Info size={16} aria-hidden="true" /></Popover.Trigger
	>
	<Popover.Portal
		><Popover.Content
			class="info-content"
			role="dialog"
			aria-label={label}
			sideOffset={8}
			collisionPadding={16}><p>{text}</p></Popover.Content
		></Popover.Portal
	>
</Popover.Root>

<style>
	:global(.info-trigger) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--sc-muted);
		cursor: pointer;
		flex-shrink: 0;
	}
	:global(.info-trigger:hover) {
		background: var(--sc-inset);
		color: var(--sc-link);
	}
	:global(.info-trigger:focus-visible) {
		outline: 2px solid var(--sc-focus);
		outline-offset: 2px;
	}
	:global(.info-content) {
		max-width: min(300px, calc(100vw - 32px));
		padding: 12px 16px;
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		box-shadow: var(--sc-shadow);
		z-index: 100;
		font-size: 13px;
		line-height: 1.6;
	}
	p {
		margin: 0;
	}
	@media (max-width: 760px) {
		:global(.info-trigger) {
			width: 44px;
			height: 44px;
			min-height: 44px;
		}
	}
</style>
