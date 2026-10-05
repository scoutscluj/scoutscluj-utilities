<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Info from '@lucide/svelte/icons/info';
	import { money, receiptMethodLabels, type Dashboard, type Obligation } from './types';
	let { ledger, obligation }: { ledger: Dashboard; obligation: Obligation } = $props();
	const componentId = $props.id();
	const tooltipId = `${componentId}-payment-details`;
	let anchor = $state<HTMLButtonElement>();
	let content = $state<HTMLDivElement>();
	let open = $state(false);
	let focused = $state(false);
	let ready = $state(false);
	let left = $state(0);
	let top = $state(0);
	let above = $state(false);
	let maxHeight = $state(360);
	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	function position() {
		if (!open || !anchor) return;
		const rect = anchor.getBoundingClientRect();
		const width = Math.min(330, window.innerWidth - 32);
		left = Math.max(
			16,
			Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 16)
		);
		above = rect.top > window.innerHeight / 2;
		top = above ? rect.top - 8 : rect.bottom + 8;
		maxHeight = Math.max(80, Math.min(360, above ? top - 16 : window.innerHeight - top - 16));
	}
	function show() {
		clearTimeout(closeTimer);
		open = true;
		position();
	}
	function leave() {
		clearTimeout(closeTimer);
		if (!focused)
			closeTimer = setTimeout(() => {
				open = false;
			}, 150);
	}
	function outside(event: PointerEvent) {
		if (
			event.target instanceof Node &&
			!anchor?.contains(event.target) &&
			!content?.contains(event.target)
		)
			open = false;
	}
	onMount(() => {
		ready = true;
		window.addEventListener('scroll', position, true);
		window.addEventListener('resize', position);
		return () => {
			window.removeEventListener('scroll', position, true);
			window.removeEventListener('resize', position);
		};
	});
	onDestroy(() => clearTimeout(closeTimer));
	const allocations = $derived(
		ledger.allocations.filter((a) => a.obligationId === obligation.id && !a.reversed)
	);
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape') {
			clearTimeout(closeTimer);
			open = false;
		}
	}}
	onpointerdown={outside}
/>
<button
	bind:this={anchor}
	type="button"
	disabled={!ready}
	class="payment-info"
	aria-label={`Detalii plată pentru ${obligation.memberName}`}
	aria-describedby={open ? tooltipId : undefined}
	onmouseenter={show}
	onmouseleave={leave}
	onfocus={() => {
		focused = true;
		show();
	}}
	onblur={() => {
		focused = false;
		leave();
	}}
	onclick={show}
>
	<Info size={16} aria-hidden="true" />
</button>
{#if open}
	<div
		bind:this={content}
		id={tooltipId}
		role="tooltip"
		class="payment-tooltip"
		style:position="fixed"
		style:left={`${left}px`}
		style:top={`${top}px`}
		style:transform={above ? 'translateY(-100%)' : undefined}
		style:max-height={`${maxHeight}px`}
		onmouseenter={() => clearTimeout(closeTimer)}
		onmouseleave={leave}
	>
		<strong>Istoricul plăților</strong>
		<span class="tooltip-name">{obligation.memberName}</span>
		{#each allocations as allocation (allocation.id)}
			{@const receipt = ledger.receipts.find((r) => r.id === allocation.receiptId)}
			<div class="tooltip-payment">
				<div>
					<b>{money(allocation.amountBani)}</b><span
						>{receiptMethodLabels[receipt?.method ?? ''] ?? 'Metodă necunoscută'}</span
					>
				</div>
				<small>{receipt?.receivedOn} · {receipt?.reference}</small>
				{#if receipt?.note}<small>{receipt.note}</small>{/if}
			</div>
		{:else}<p>Nu există încasări alocate acestui membru.</p>{/each}
	</div>
{/if}

<style>
	:global(.payment-info) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		padding: 5px !important;
		margin: 0 0 0 4px !important;
		border: 0 !important;
		border-radius: 50% !important;
		background: #f0f5f3 !important;
		color: #64748b !important;
		vertical-align: middle;
		cursor: pointer;
	}
	:global(.payment-info:hover),
	:global(.payment-info:focus-visible) {
		color: #166534 !important;
		background: #dcfce7 !important;
	}
	:global(.payment-tooltip) {
		z-index: 80;
		width: min(330px, calc(100vw - 32px));
		max-height: min(360px, 60vh);
		overflow-y: auto;
		border: 1px solid #dbe5df;
		border-radius: 14px;
		padding: 16px;
		background: white;
		color: #1e293b;
		font-size: 0.85rem;
		line-height: 1.5;
		box-shadow: 0 12px 36px #0f172a26;
		overflow-wrap: anywhere;
	}
	.tooltip-name {
		display: block;
		color: #64748b;
		margin-top: 2px;
	}
	.tooltip-payment {
		border-top: 1px solid #edf2f0;
		margin-top: 12px;
		padding-top: 12px;
	}
	.tooltip-payment div {
		display: flex;
		justify-content: space-between;
		gap: 10px;
	}
	small {
		display: block;
		color: #64748b;
		margin-top: 4px;
	}
	p {
		margin-bottom: 0;
		color: #64748b;
	}
</style>
