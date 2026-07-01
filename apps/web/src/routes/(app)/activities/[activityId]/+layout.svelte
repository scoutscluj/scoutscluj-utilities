<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	let { data, children } = $props();

	const kitchenPath = $derived(resolve(`/activities/${data.activity.id}/kitchen`));
	const isKitchenRoute = $derived(page.url.pathname.startsWith(kitchenPath));
	const kitchenTabs = $derived([
		{ label: 'Mese', href: resolve(`/activities/${data.activity.id}/kitchen/meals`) },
		{ label: 'Ingrediente', href: resolve(`/activities/${data.activity.id}/kitchen/ingredients`) },
		{ label: 'Rețete', href: resolve(`/activities/${data.activity.id}/kitchen/recipes`) },
		{
			label: 'Aprovizionare',
			href: resolve(`/activities/${data.activity.id}/kitchen/procurement`)
		},
		{ label: 'Rapoarte', href: resolve(`/activities/${data.activity.id}/kitchen/reports`) }
	]);

	const isActive = (href: string) => page.url.pathname.startsWith(href);
</script>

<svelte:head>
	<title>{data.activity.title} | Scouts Cluj Utilities</title>
</svelte:head>

<section class="activity-shell">
	{#if isKitchenRoute}
		<nav class="kitchen-tabs" aria-label="Meniu bucătărie">
			{#each kitchenTabs as tab (tab.href)}
				<a href={tab.href} class:active={isActive(tab.href)}>{tab.label}</a>
			{/each}
		</nav>
	{/if}

	{@render children()}
</section>

<style>
	.activity-shell {
		display: grid;
		gap: 12px;
	}

	.kitchen-tabs {
		display: flex;
		overflow-x: auto;
		gap: 6px;
		align-items: center;
		border-bottom: 1px solid #dbe3ef;
		padding-bottom: 8px;
	}

	.kitchen-tabs a {
		min-height: 34px;
		display: inline-flex;
		align-items: center;
		border: 1px solid transparent;
		border-radius: 8px;
		background: #f8fafc;
		padding: 0 12px;
		color: #475569;
		font-size: 0.9rem;
		font-weight: 800;
		text-decoration: none;
		white-space: nowrap;
	}

	.kitchen-tabs a.active,
	.kitchen-tabs a:hover {
		border-color: #dbe3ef;
		background: #ffffff;
		color: #991b1b;
	}
</style>
