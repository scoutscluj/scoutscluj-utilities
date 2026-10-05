<script lang="ts">
	import type { Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';
	import WalletCards from '@lucide/svelte/icons/wallet-cards';
	import type { MembershipAdminForm } from './admin-ledger';
	let {
		title,
		description,
		form,
		children
	}: {
		title: string;
		description: string;
		form?: MembershipAdminForm | null;
		children: Snippet;
	} = $props();
	let lastMessage = $state<string>();
	$effect(() => {
		if (form?.message && form.message !== lastMessage) {
			lastMessage = form.message;
			if (form.success === false) toast.error(form.message);
			else toast.success(form.message);
		}
	});
</script>

<svelte:head><title>{title} · Admin financiar · Scouts Cluj</title></svelte:head>
<div class="membership-admin">
	<header>
		<span class="page-eyebrow"><WalletCards size={15} aria-hidden="true" /> Admin financiar</span>
		<h1>{title}</h1>
		<p>{description}</p>
	</header>
	{#if form?.message}<p class="notice" role="status">{form.message}</p>{/if}
	{@render children()}
</div>

<style>
	h1 {
		margin: 0 0 10px;
		font-size: clamp(1.6rem, 3vw, 2.2rem);
	}
	header {
		margin-bottom: 24px;
	}
	.page-eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		color: #15803d;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		margin-bottom: 12px;
	}
	header p {
		margin: 0;
		color: #64748b;
		line-height: 1.6;
	}
	.membership-admin :global(section),
	.membership-admin :global(details) {
		margin: 20px 0;
		border: 1px solid #e1e8e4;
		border-radius: 16px;
		padding: 24px;
		background: white;
		box-shadow: 0 3px 14px #163a2410;
	}
	.membership-admin :global(h2) {
		margin: 0 0 16px;
		font-size: 1.2rem;
	}
	.membership-admin :global(h3) {
		font-size: 1rem;
	}
	.membership-admin :global(p) {
		line-height: 1.6;
	}
	.membership-admin :global(.grid) {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 16px;
		margin-top: 20px;
	}
	.membership-admin :global(.grid > p),
	.membership-admin :global(.grid > fieldset) {
		grid-column: 1 / -1;
	}
	.membership-admin :global(.grid > button) {
		justify-self: start;
		align-self: end;
	}
	.membership-admin :global(label) {
		display: grid;
		gap: 6px;
		font-size: 0.9rem;
		color: #475569;
	}
	.membership-admin :global(input),
	.membership-admin :global(select),
	.membership-admin :global(textarea),
	.membership-admin :global(button) {
		font: inherit;
		padding: 10px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		max-width: 100%;
	}
	.membership-admin :global(input:not([type='checkbox'])),
	.membership-admin :global(select),
	.membership-admin :global(textarea) {
		width: 100%;
		min-width: 0;
		background: white;
	}
	.membership-admin :global(input[type='checkbox']) {
		accent-color: #166534;
	}
	.membership-admin :global(button) {
		background: #166534;
		color: white;
		cursor: pointer;
		margin-top: 12px;
	}
	.membership-admin :global(button:disabled) {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.membership-admin :global(button:hover:not(:disabled)) {
		filter: brightness(0.96);
	}
	.membership-admin :global(.panel-heading) {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}
	.membership-admin :global(.panel-heading h2) {
		margin-bottom: 6px;
	}
	.membership-admin :global(.panel-heading p) {
		margin: 0;
		color: #64748b;
		font-size: 0.85rem;
	}
	.membership-admin :global(.panel-heading button) {
		margin-top: 0;
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 11px 16px;
		font-weight: 600;
	}
	.membership-admin :global(.empty-state) {
		padding: 36px 20px;
		text-align: center;
		color: #64748b;
	}
	.membership-admin :global(.empty-state svg) {
		color: #15803d;
		margin: 0 auto 12px;
	}
	.membership-admin :global(.empty-state h2) {
		color: #334155;
		margin-bottom: 8px;
	}
	.membership-admin :global(.muted) {
		color: #64748b;
		font-size: 0.85rem;
	}
	.membership-admin :global(summary) {
		cursor: pointer;
		font-weight: 600;
		list-style-position: outside;
		margin-left: 16px;
		color: #334155;
	}
	.membership-admin :global(.scroll) {
		overflow: auto;
	}
	.membership-admin :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin-top: 16px;
	}
	.membership-admin :global(th),
	.membership-admin :global(td) {
		padding: 12px;
		text-align: left;
		border-bottom: 1px solid #e2e8f0;
	}
	.membership-admin :global(th) {
		background: #f8fafc;
		color: #475569;
		font-size: 0.8rem;
		font-weight: 600;
		white-space: nowrap;
	}
	.membership-admin :global(td) {
		vertical-align: middle;
		font-size: 0.9rem;
	}
	.membership-admin :global(tbody tr:hover) {
		background: #f8fafc;
	}
	.membership-admin :global(td details) {
		margin: 8px 0;
		padding: 0;
		border: 0;
		background: transparent;
	}
	.membership-admin :global(small) {
		display: block;
		color: #64748b;
		margin-top: 3px;
	}
	.membership-admin :global(.notice) {
		background: #fff7ed;
		padding: 16px;
		border-radius: 8px;
	}
	.membership-admin :global(.stats-grid) {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
		margin-bottom: 20px;
	}
	.membership-admin :global(.stat) {
		padding: 20px;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		background: white;
		box-shadow: 0 3px 12px #163a2408;
	}
	.membership-admin :global(.stat span) {
		display: block;
		color: #64748b;
		font-size: 0.85rem;
	}
	.membership-admin :global(.stat strong) {
		display: block;
		font-size: 1.4rem;
		margin-top: 8px;
	}
	.membership-admin :global(.filters) {
		display: grid;
		grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) minmax(220px, 2fr);
		gap: 16px;
		margin-bottom: 20px;
	}
	.membership-admin :global(fieldset) {
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 12px;
	}
	.membership-admin :global(.check) {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.membership-admin :global(.row) {
		padding: 10px 0;
		border-bottom: 1px solid #e2e8f0;
	}
	.membership-admin :global(:is(button, input, select, textarea, a, summary):focus-visible) {
		outline: 3px solid #86efac;
		outline-offset: 3px;
	}
	@media (max-width: 800px) {
		.membership-admin :global(.stats-grid) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.membership-admin :global(.filters) {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 480px) {
		.membership-admin :global(section),
		.membership-admin :global(details) {
			padding: 18px;
		}
		.membership-admin :global(.grid) {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
